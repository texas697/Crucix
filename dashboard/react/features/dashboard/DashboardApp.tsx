import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiClient } from '../../api/client';
import type { HealthResponse, SweepData, UserProfile } from '../../api/types';
import { createTransport, shouldUseSse } from '../../api/transport';
import type { HistoryAdapter } from '../../state/history';
import { parseUrl } from '../../state/url';
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
import { plotData, type TrackRow, type QuakeRow } from '../map/plot';

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
                  />
                </Suspense>
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
