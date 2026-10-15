import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiClient } from '../../api/client';
import type { HealthResponse, SweepData, UserProfile } from '../../api/types';
import { createTransport, shouldUseSse } from '../../api/transport';
import type { HistoryAdapter } from '../../state/history';
import { parseUrl, shapeToUrl, type Shape } from '../../state/url';
import {
  applyTheme as applyThemeClass, persistTheme, readStoredTheme, resolveTheme, toggleTheme as flipTheme,
  type Theme,
} from '../../shared/theme';
import { PageShell } from '../../app/PageShell';
import { createTranslator } from '../../shared/locale';
import { Row } from './Panel';
import { SensorGrid, NuclearWatch, RiskGauges } from './panels/LeftRail';
import { SignalCore, SweepDelta, DisastersPanel, OutagesPanel } from './panels/RowB';
import { RowC } from './panels/RowC';
import { MarketsPanel } from './panels/RowE';
import { HealthWatchPanel } from './panels/HealthWatch';
import { RowD } from './panels/RowD';
import { useLiveFeeds } from './useLiveFeeds';
import { StartupState } from './StartupState';
import { TopBar } from './TopBar';
import { NewsTicker, type TickerItem } from './NewsTicker';
import { SettingsOverlay } from '../settings/SettingsOverlay';
import { type MapViewHandle, type MapLabel } from '../map/MapView';
import { RegionBar } from '../map/RegionBar';
import { MapLegend, LayerInfoOverlay } from '../map/MapLegend';
import { LAYER_DEFS, LAYER_INFO, type TimeWindow } from '../map/layerDefs';
import { REGION_LABEL, clampRegion, type RegionKey } from '../map/regions';
import { plotData, type TrackRow, type QuakeRow, type MapPoint } from '../map/plot';
import { runSelection, nearestMapPoint, circleFeature, rectFeature, polyFeature, type DrawTool, type DrawFeature } from '../map/selection';
import { MapPopup } from '../map/MapPopup';
import { SelectionPanel } from '../map/SelectionPanel';
import { AreaBrief, loadAreaBrief, markersPayload, EMPTY_AREA_BRIEF, type AreaBriefState } from '../map/AreaBrief';

// MapLibre is large; load the map as its own lazy chunk so it never inflates the shell or the other
// surfaces' bundles (the plan keeps map/media/login code out of unrelated page bundles).
const MapView = lazy(() => import('../map/MapView').then((m) => ({ default: m.MapView })));

// The dashboard shell. Owns the transport lifecycle, the startup/ready switch, the top bar, the map
// surface (MapLibre + region bar + legend + layer toggles) and the settings overlay. The legacy
// dashboard stays authoritative until the whole surface passes parity.

export interface DashboardAppProps {
  api: ApiClient;
  me: UserProfile | null;
  history: HistoryAdapter;
  /** Initial location; popstate re-reads window.location when available. */
  location: { href: string; pathname: string; search: string };
  onMeChange: (me: UserProfile | null) => void;
  onLogout: () => void;
  now?: () => number;
}

function initialSettingsOpen(location: DashboardAppProps['location']): boolean {
  return parseUrl(location.href).q.settings === '1';
}

function initialRegion(location: DashboardAppProps['location']): RegionKey {
  const q = parseUrl(location.href).q;
  if (q.region) return clampRegion(q.region);
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('crucix_region') : null;
    if (stored) return clampRegion(stored);
  } catch { /* storage denied */ }
  return 'world';
}

function allLayersVisible(): Record<string, boolean> {
  return Object.fromEntries(LAYER_DEFS.map((l) => [l.key, true]));
}

export function DashboardApp({ api, me, history, location, onMeChange, onLogout, now = Date.now }: DashboardAppProps) {
  const [data, setData] = useState<SweepData | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStoredTheme(safeStorage())));
  const [myIdeas, setMyIdeas] = useState<{ ideas?: unknown[]; provider?: string; generatedAt?: string } | null>(null);
  const [region, setRegionState] = useState<RegionKey>(() => initialRegion(location));
  const [layerVisible, setLayerVisible] = useState<Record<string, boolean>>(allLayersVisible);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
  const [layerInfoKey, setLayerInfoKey] = useState<string | null>(null);
  const [drawTool, setDrawTool] = useState<DrawTool | null>(null);
  const [selected, setSelected] = useState<MapPoint[]>([]);
  const [brief, setBrief] = useState<AreaBriefState>(EMPTY_AREA_BRIEF);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const settingsOpenedRef = useRef(false);
  const mapRef = useRef<MapViewHandle>(null);
  const seenMarkersRef = useRef<Set<string> | null>(null);

  // Theme: apply to <html> and persist on change.
  useEffect(() => {
    if (typeof document !== 'undefined') applyThemeClass(theme, document.documentElement);
    persistTheme(theme, safeStorage());
  }, [theme]);

  // One transport per mount; a 401 from its health poll is the session-expiry signal.
  useEffect(() => {
    const transport = createTransport({
      client: api,
      onData: setData,
      onHealth: setHealth,
      onSweepError: (err) => setSweepError(err instanceof Error ? err.message : String(err)),
      onSessionExpired: () => redirectToLogin(),
      sseEnabled: typeof location !== 'undefined' && shouldUseSse(locationHost()),
    });
    const stop = transport.start();
    return () => { stop(); transport.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
    history.set('/', { settings: '1' }, { push: true, state: { k: 'settings' } });
  }, [history]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    if (history.afterClose('settings') === 'rewrite') {
      history.set('/', {}, { push: false });
    }
  }, [history]);

  // `/?settings=1` opens the overlay once /api/me has resolved (auth-off renders no overlay).
  useEffect(() => {
    if (settingsOpenedRef.current) return;
    if (initialSettingsOpen(location) && me) {
      settingsOpenedRef.current = true;
      setSettingsOpen(true);
    }
  }, [location, me]);

  const tickerItems = useMemo<TickerItem[]>(() => {
    const feed = (data?.newsFeed as TickerItem[] | undefined) ?? (data?.news as TickerItem[] | undefined) ?? [];
    return Array.isArray(feed) ? feed : [];
  }, [data]);

  const meta = (data?.meta as SweepData['meta'] | undefined) ?? null;

  // The server injects the selected locale dictionary; panels fall back to English literals without it.
  const t = useMemo(() => {
    const dict = typeof window !== 'undefined'
      ? (window as unknown as { __CRUCIX_LOCALE__?: unknown }).__CRUCIX_LOCALE__
      : undefined;
    return dict ? createTranslator(dict) : undefined;
  }, []);

  // "Generate ideas now": without a key it opens settings; with one it POSTs /api/ideas and overlays
  // the user's ideas onto the shared payload (legacy applyUserIdeas).
  const generateIdeas = useCallback(async () => {
    if (!me?.llm) { openSettings(); return; }
    try {
      const payload = await api.post<{ ideas?: unknown[]; provider?: string; generatedAt?: string }>('/api/ideas');
      setMyIdeas(payload);
    } catch { /* the ideas panel keeps its own empty/BYOK state */ }
  }, [me, api, openSettings]);

  const panelData = useMemo<SweepData | null>(() => {
    if (!data) return null;
    if (myIdeas?.ideas?.length) {
      return { ...data, ideas: myIdeas.ideas, ideasSource: 'mine', ideasMeta: myIdeas } as SweepData;
    }
    return data;
  }, [data, myIdeas]);

  // Live feeds with the legacy cadences (tracks 15s, alerts 45s, quakes 60s, markets 60s).
  const { tracks, alerts, quakes, markets } = useLiveFeeds(api, { enabled: panelData !== null });

  // Marker plotting: pure data → GeoJSON + labels + counts; `seenMarkers` drives the "new" flag.
  const plot = useMemo(() => {
    if (!panelData) return null;
    return plotData({
      data: panelData,
      layerVisible,
      region,
      timeWindow,
      seenMarkers: seenMarkersRef.current,
      showAggregates: true,
      tracks: tracks ? { tracks: tracks as TrackRow[] } : null,
      ships: null,
      quakes: (quakes as QuakeRow[] | null) ?? null,
    });
    // `seenMarkersRef` is intentionally read (not a dependency) so the diff is computed per data change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelData, layerVisible, region, timeWindow, tracks, quakes]);

  useEffect(() => {
    if (plot) seenMarkersRef.current = plot.nextSeen;
  }, [plot]);

  const mapLabels = useMemo<MapLabel[]>(
    () => (plot?.labels ?? []).map((l) => ({ text: l.text, anchor: [l.lng, l.lat] as [number, number], region: l.region })),
    [plot],
  );

  const setRegion = useCallback((r: RegionKey) => {
    setRegionState(r);
    try { localStorage.setItem('crucix_region', r); } catch { /* storage denied */ }
    mapRef.current?.flyToRegion(r);
    history.set('/', { region: r !== 'world' ? r : '' }, { push: true, state: { k: 'region' } });
  }, [history]);

  const searchMapRegion = useCallback((query: string) => {
    const needle = query.trim().toLowerCase();
    const hit = (Object.entries(REGION_LABEL) as [RegionKey, string][])
      .find(([, label]) => label.toLowerCase() === needle);
    if (hit) setRegion(hit[0]);
  }, [setRegion]);

  const toggleLayer = useCallback((key: string) => {
    setLayerVisible((v) => ({ ...v, [key]: !v[key] }));
  }, []);
  const setAllLayers = useCallback((on: boolean) => setLayerVisible(allLayersVisibleOn(on)), []);
  const clearRegion = useCallback(() => setRegion('world'), [setRegion]);

  // Drawing a shape selects the markers inside it and loads the area brief (legacy runSelection +
  // loadAreaBrief); the shape is written to ?shape= so it is shareable.
  const clearSelection = useCallback(() => {
    setSelected([]);
    setBrief(EMPTY_AREA_BRIEF);
    setDrawTool(null);
  }, []);

  const completeDraw = useCallback((shape: Shape) => {
    setDrawTool(null);
    const feature = shapeToFeature(shape);
    setBrief(EMPTY_AREA_BRIEF);
    if (plot) {
      setSelected(runSelection(feature, plot.mapPoints));
      void loadAreaBrief(api, {
        shape,
        markers: markersPayload(plot.mapPoints),
        onUpdate: (patch) => setBrief((cur) => ({ ...cur, ...patch })),
        onError: (err) => setSweepError(err.message),
      });
    }
    history.set('/', { shape: shapeToUrl(shape) }, { push: true, state: { k: 'shape' } });
  }, [plot, api, history]);

  const focusSelection = useCallback((index: number) => {
    const point = selected[index];
    if (point) mapRef.current?.flyToPoint(point.lng, point.lat, 5);
  }, [selected]);

  const handleCanvasClick = useCallback((info: { lng: number; lat: number }) => {
    if (!plot) return;
    const point = nearestMapPoint(info.lat, info.lng, plot.mapPoints);
    if (!point) return;
    let left = 50;
    let top = 50;
    const map = mapRef.current?.getMap();
    if (map) {
      const projected = map.project([point.lng, point.lat]);
      const container = map.getContainer();
      const rect = container.getBoundingClientRect();
      if (rect.width && rect.height) {
        left = (projected.x / rect.width) * 100;
        top = (projected.y / rect.height) * 100;
      }
    }
    setPopup({ head: point.popHead, text: point.popText, meta: point.popMeta, url: point.url, isNew: point._new, lng: point.lng, lat: point.lat, left, top });
  }, [plot]);

  const selectedFC = useMemo(() => ({
    type: 'FeatureCollection',
    features: selected.map((p) => ({
      type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  }) as GeoJSON.FeatureCollection, [selected]);

  const markers = plot?.points.features.length ?? 0;

  return (
    <PageShell surface="dashboard">
      <TopBar
        me={me}
        health={health}
        meta={meta}
        theme={theme}
        onToggleTheme={() => setTheme((th) => flipTheme(th))}
        onOpenSettings={openSettings}
        onLogout={onLogout}
        now={now}
      />
      {sweepError && <div className="sweep-error" role="alert">Sweep error: {sweepError}</div>}
      {!data || !panelData || !plot
        ? <StartupState health={health} now={now} />
        : (
          <>
            <div className="map-wrap">
              <RegionBar
                region={region}
                sourcesOk={meta?.sourcesOk ?? 0}
                sourcesQueried={meta?.sourcesQueried ?? 0}
                markers={markers}
                news={tickerItems.length}
                onRegion={setRegion}
                onSearch={searchMapRegion}
                hint="Scroll to zoom · drag to pan"
              />
              <div className="map-container" id="mapContainer">
                <Suspense fallback={<div className="map-loading show" id="mapLoading"><span id="mapLoadingText">Initializing map</span></div>}>
                  <MapView
                    ref={mapRef}
                    theme={theme}
                    points={plot.points}
                    labels={mapLabels}
                    rings={plot.rings}
                    trails={plot.trails}
                    region={region}
                    selected={selectedFC}
                    drawTool={drawTool}
                    onDrawComplete={completeDraw}
                    onDrawCancel={() => setDrawTool(null)}
                    onCanvasClick={handleCanvasClick}
                  />
                </Suspense>
                <div className="map-controls">
                  <button type="button" className={`mc${drawTool === 'circle' ? ' on' : ''}`} aria-label="Draw circle" aria-pressed={drawTool === 'circle'} onClick={() => setDrawTool(drawTool === 'circle' ? null : 'circle')}>◯</button>
                  <button type="button" className={`mc${drawTool === 'rect' ? ' on' : ''}`} aria-label="Draw rectangle" aria-pressed={drawTool === 'rect'} onClick={() => setDrawTool(drawTool === 'rect' ? null : 'rect')}>▭</button>
                  <button type="button" className={`mc${drawTool === 'poly' ? ' on' : ''}`} aria-label="Draw polygon" aria-pressed={drawTool === 'poly'} onClick={() => setDrawTool(drawTool === 'poly' ? null : 'poly')}>⬠</button>
                  <button type="button" className="mc" aria-label="Clear selection" onClick={clearSelection}>✕</button>
                </div>
                {popup && (
                  <MapPopup
                    head={popup.head}
                    text={popup.text}
                    meta={popup.meta}
                    url={popup.url}
                    isNew={popup.isNew}
                    lng={popup.lng}
                    lat={popup.lat}
                    left={popup.left}
                    top={popup.top}
                    onClose={() => setPopup(null)}
                    onCopy={() => {
                      try { void navigator.clipboard?.writeText(`${popup.lng.toFixed(4)},${popup.lat.toFixed(4)}`); } catch { /* clipboard denied */ }
                    }}
                  />
                )}
                <SelectionPanel
                  items={selected}
                  onFocus={focusSelection}
                  onClear={clearSelection}
                  brief={<AreaBrief state={brief} />}
                  hasBrief={brief.status !== 'idle'}
                />
                <MapLegend
                  region={region}
                  layerCounts={plot.layerCounts}
                  visible={layerVisible}
                  timeWindow={timeWindow}
                  onToggleLayer={toggleLayer}
                  onSetAll={setAllLayers}
                  onSetTimeWindow={setTimeWindow}
                  onClearRegion={clearRegion}
                  onInfo={setLayerInfoKey}
                />
                <LayerInfoOverlay
                  layerKey={layerInfoKey}
                  info={layerInfoKey ? LAYER_INFO[layerInfoKey] ?? null : null}
                  onClose={() => setLayerInfoKey(null)}
                />
              </div>
            </div>
            <main className="dashboard-main" id="main">
              <Row name="a">
                <SensorGrid data={panelData} t={t} />
                <NewsTicker items={tickerItems} now={now} />
                <HealthWatchPanel data={panelData} t={t} />
              </Row>
              <Row name="b">
                <SignalCore data={panelData} t={t} />
                <NuclearWatch data={panelData} t={t} />
                <RiskGauges data={panelData} t={t} />
                <SweepDelta data={panelData} t={t} />
                <DisastersPanel data={panelData} t={t} quakes={quakes ?? undefined} />
                <OutagesPanel data={panelData} t={t} />
              </Row>
              <Row name="c">
                <RowC data={panelData} t={t} me={me} onGenerateIdeas={generateIdeas} />
              </Row>
              <Row name="d">
                <RowD data={panelData} t={t} alerts={alerts ?? undefined} tracks={tracks ?? undefined} markets={markets ?? undefined} />
              </Row>
              <Row name="e">
                <MarketsPanel data={panelData} t={t} />
              </Row>
            </main>
          </>
        )}
      <SettingsOverlay
        open={settingsOpen}
        me={me}
        api={api}
        onClose={closeSettings}
        onProfileChange={onMeChange}
      />
    </PageShell>
  );
}

function allLayersVisibleOn(on: boolean): Record<string, boolean> {
  return Object.fromEntries(LAYER_DEFS.map((l) => [l.key, on]));
}

interface PopupInfo {
  head?: string;
  text?: string;
  meta?: string;
  url?: string;
  isNew?: boolean;
  lng: number;
  lat: number;
  left: number;
  top: number;
}

/** Convert a URL Shape back to the drawable feature the selection helpers consume. */
function shapeToFeature(shape: Shape): DrawFeature {
  if (shape.kind === 'circle') return circleFeature({ lng: shape.center.lng, lat: shape.center.lat }, shape.radiusKm);
  if (shape.kind === 'rect') {
    return rectFeature({ lng: shape.sw.lng, lat: shape.sw.lat }, { lng: shape.ne.lng, lat: shape.ne.lat });
  }
  return polyFeature(shape.ring.map((p) => [p.lng, p.lat] as [number, number]));
}

function locationHost(): string {
  return typeof location !== 'undefined' ? location.hostname : '';
}

function redirectToLogin(): void {
  if (typeof location === 'undefined') return;
  const here = location.pathname + location.search;
  location.replace(`/login?reason=expired&next=${encodeURIComponent(here)}`);
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
