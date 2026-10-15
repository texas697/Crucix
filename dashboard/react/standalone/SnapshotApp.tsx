// Snapshot-only dashboard surface (P8). Renders the ported dashboard from a snapshot injected at
// export time, with NO network activity at all: no `/api/*`, no SSE stream, no live-feed polling and
// no account/AI calls. It reuses the same panels, map chrome and selectors as `DashboardApp`, but the
// data is the embedded `snapshot` and every action that would hit the server is either local or a
// no-op, so opening an exported file never contacts a provider or the crucix backend.
//
// This is deliberately separate from `DashboardApp`: that component owns a transport, health polling
// and live feeds, none of which exist in a standalone HTML file. Keeping the snapshot surface here
// means the app shell can keep its lifecycle unchanged.

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HealthResponse, SweepData } from '../api/types';
import {
  applyTheme as applyThemeClass, persistTheme, readStoredTheme, resolveTheme, toggleTheme as flipTheme,
  type Theme,
} from '../shared/theme';
import { PageShell } from '../app/PageShell';
import { createTranslator } from '../shared/locale';
import { Row } from '../features/dashboard/Panel';
import { SensorGrid, NuclearWatch, RiskGauges } from '../features/dashboard/panels/LeftRail';
import { SignalCore, SweepDelta, DisastersPanel, OutagesPanel } from '../features/dashboard/panels/RowB';
import { RowC } from '../features/dashboard/panels/RowC';
import { MarketsPanel } from '../features/dashboard/panels/RowE';
import { HealthWatchPanel } from '../features/dashboard/panels/HealthWatch';
import { RowD } from '../features/dashboard/panels/RowD';
import { SignalGuide } from '../features/dashboard/SignalGuide';
import { StartupState } from '../features/dashboard/StartupState';
import { TopBar } from '../features/dashboard/TopBar';
import { NewsTicker, type TickerItem } from '../features/dashboard/NewsTicker';
import { type MapViewHandle, type MapLabel } from '../features/map/MapView';
import { RegionBar } from '../features/map/RegionBar';
import { MapLegend, LayerInfoOverlay } from '../features/map/MapLegend';
import { LAYER_DEFS, LAYER_INFO, type TimeWindow } from '../features/map/layerDefs';
import { REGION_LABEL, inRegionBox, textInRegion, type RegionKey } from '../features/map/regions';
import { plotData, type MapPoint } from '../features/map/plot';
import {
  runSelection, nearestMapPoint, circleFeature, rectFeature, polyFeature,
  type DrawTool, type DrawFeature,
} from '../features/map/selection';
import { MapPopup } from '../features/map/MapPopup';
import { SelectionPanel } from '../features/map/SelectionPanel';
import { AreaBrief, EMPTY_AREA_BRIEF } from '../features/map/AreaBrief';
import type { Shape } from '../state/url';

// MapLibre stays lazy (as in the app shell); the standalone build sets `inlineDynamicImports` so the
// chunk is folded into the single IIFE and there is no extra `file:` request.
const MapView = lazy(() => import('../features/map/MapView').then((m) => ({ default: m.MapView })));

export interface SnapshotAppProps {
  /** The injected snapshot; `null` renders the same startup state the live dashboard shows pre-sweep. */
  snapshot: SweepData | null;
  /** Clock seam (relative ages, startup elapsed). */
  now?: () => number;
}

function allLayersVisible(): Record<string, boolean> {
  return Object.fromEntries(LAYER_DEFS.map((l) => [l.key, true]));
}

/** Region slice of the snapshot for the panels; identical to the app shell's `filterByRegion`. */
function filterByRegion(data: SweepData, region: RegionKey): SweepData {
  if (region === 'world') return data;
  const out = { ...data };
  const news = data.news as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(news)) {
    out.news = news.filter((n) => inRegionBox(Number(n.lat), Number(n.lon), region) || textInRegion(n.title, region));
  }
  const feed = data.newsFeed as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(feed)) {
    out.newsFeed = feed.filter((n) => textInRegion(`${n.region ?? ''} ${n.headline ?? ''}`, region));
  }
  const disasters = data.disasters as { events?: Array<Record<string, unknown>> } | undefined;
  if (disasters?.events) {
    out.disasters = { ...disasters, events: disasters.events.filter((e) => inRegionBox(Number(e.lat), Number(e.lon), region)) };
  }
  const outages = data.outages as { countries?: Array<Record<string, unknown>> } | undefined;
  if (outages?.countries) {
    out.outages = { ...outages, countries: outages.countries.filter((c) => inRegionBox(Number(c.lat), Number(c.lon), region)) };
  }
  return out;
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/** The embedded snapshot is the whole payload; surface its `meta` as a health hint for the top bar. */
function healthFromSnapshot(snapshot: SweepData | null): HealthResponse | null {
  if (!snapshot?.meta) return null;
  return {
    status: 'snapshot',
    uptime: 0,
    lastSweep: snapshot.meta.timestamp,
    nextSweep: null,
    sweepInProgress: false,
    sweepStartedAt: null,
    sourcesOk: snapshot.meta.sourcesOk,
    sourcesFailed: snapshot.meta.sourcesFailed,
    llmEnabled: false,
    llmProvider: null,
    authEnabled: false,
    byokEnabled: false,
    sweepMode: 'snapshot',
    refreshIntervalMinutes: 0,
    language: 'en',
  };
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

function shapeToFeature(shape: Shape): DrawFeature {
  if (shape.kind === 'circle') return circleFeature({ lng: shape.center.lng, lat: shape.center.lat }, shape.radiusKm);
  if (shape.kind === 'rect') {
    return rectFeature({ lng: shape.sw.lng, lat: shape.sw.lat }, { lng: shape.ne.lng, lat: shape.ne.lat });
  }
  return polyFeature(shape.ring.map((p) => [p.lng, p.lat] as [number, number]));
}

export function SnapshotApp({ snapshot, now = Date.now }: SnapshotAppProps) {
  const data = snapshot;
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStoredTheme(safeStorage())));
  const [region, setRegionState] = useState<RegionKey>('world');
  const [layerVisible, setLayerVisible] = useState<Record<string, boolean>>(allLayersVisible);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
  const [layerInfoKey, setLayerInfoKey] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool | null>(null);
  const [selected, setSelected] = useState<MapPoint[]>([]);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const mapRef = useRef<MapViewHandle>(null);
  const seenMarkersRef = useRef<Set<string> | null>(null);

  // Theme: local only (listStorage), never a request.
  useEffect(() => {
    if (typeof document !== 'undefined') applyThemeClass(theme, document.documentElement);
    persistTheme(theme, safeStorage());
  }, [theme]);

  const t = useMemo(() => {
    const dict = typeof window !== 'undefined'
      ? (window as unknown as { __CRUCIX_LOCALE__?: unknown }).__CRUCIX_LOCALE__
      : undefined;
    return dict ? createTranslator(dict) : undefined;
  }, []);

  const tickerItems = useMemo<TickerItem[]>(() => {
    const feed = (data?.newsFeed as TickerItem[] | undefined) ?? (data?.news as TickerItem[] | undefined) ?? [];
    return Array.isArray(feed) ? feed : [];
  }, [data]);

  const meta = data?.meta ?? null;
  const health = useMemo(() => healthFromSnapshot(data), [data]);

  // No live feeds in a snapshot: tracks/alerts/quakes/markets stay undefined so the panels show their
  // "not connected" copy instead of polling. There is no transport and no external fetch.
  const plot = useMemo(() => {
    if (!data) return null;
    return plotData({
      data,
      layerVisible,
      region,
      timeWindow,
      seenMarkers: seenMarkersRef.current,
      showAggregates: true,
      tracks: null,
      ships: null,
      quakes: null,
    });
    // `seenMarkersRef` is intentionally read, not a dependency (mirrors the app shell).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, layerVisible, region, timeWindow]);

  useEffect(() => {
    if (plot) seenMarkersRef.current = plot.nextSeen;
  }, [plot]);

  const mapLabels = useMemo<MapLabel[]>(
    () => (plot?.labels ?? []).map((l) => ({ text: l.text, anchor: [l.lng, l.lat] as [number, number], region: l.region })),
    [plot],
  );

  const viewData = useMemo<SweepData | null>(
    () => (data ? filterByRegion(data, region) : null),
    [data, region],
  );

  const setRegion = useCallback((r: RegionKey) => {
    setRegionState(r);
    mapRef.current?.flyToRegion(r);
  }, []);

  const searchMapRegion = useCallback((query: string) => {
    const needle = query.trim().toLowerCase();
    const hit = (Object.entries(REGION_LABEL) as [RegionKey, string][])
      .find(([, label]) => label.toLowerCase() === needle);
    if (hit) setRegion(hit[0]);
  }, [setRegion]);

  const toggleLayer = useCallback((key: string) => {
    setLayerVisible((v) => ({ ...v, [key]: !v[key] }));
  }, []);
  const setAllLayers = useCallback((on: boolean) => {
    setLayerVisible(Object.fromEntries(LAYER_DEFS.map((l) => [l.key, on])));
  }, []);
  const clearRegion = useCallback(() => setRegion('world'), [setRegion]);

  const clearSelection = useCallback(() => {
    setSelected([]);
    setDrawTool(null);
  }, []);

  // Drawing selects markers locally. No area brief is requested (that is a server/LLM call), so the
  // brief panel stays in its idle state and a snapshot never spends anything.
  const completeDraw = useCallback((shape: Shape) => {
    setDrawTool(null);
    if (plot) setSelected(runSelection(shapeToFeature(shape), plot.mapPoints));
  }, [plot]);

  const focusSelection = useCallback((index: number) => {
    const point = selected[index];
    if (point) mapRef.current?.flyToPoint(point.lng, point.lat, 5);
  }, [selected]);

  const showPointPopup = useCallback((point: MapPoint) => {
    let left = 50;
    let top = 50;
    const map = mapRef.current?.getMap();
    if (map) {
      const projected = map.project([point.lng, point.lat]);
      const rect = map.getContainer().getBoundingClientRect();
      if (rect.width && rect.height) {
        left = (projected.x / rect.width) * 100;
        top = (projected.y / rect.height) * 100;
      }
    }
    setPopup({ head: point.popHead, text: point.popText, meta: point.popMeta, url: point.url, isNew: point._new, lng: point.lng, lat: point.lat, left, top });
  }, []);

  const handleCanvasClick = useCallback((info: { lng: number; lat: number }) => {
    if (!plot) return;
    const point = nearestMapPoint(info.lat, info.lng, plot.mapPoints);
    if (point) showPointPopup(point);
  }, [plot, showPointPopup]);

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
        me={null}
        health={health}
        meta={meta}
        theme={theme}
        onToggleTheme={() => setTheme((th) => flipTheme(th))}
        onOpenSettings={() => { /* snapshot: accounts are not available */ }}
        onLogout={() => { /* snapshot: no session */ }}
        now={now}
      />
      {!data || !plot
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
                hint="Standalone snapshot · scroll to zoom · drag to pan"
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
                  <button type="button" className="mc" aria-label="Signal guide" onClick={() => setGuideOpen(true)}>?</button>
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
                  brief={<AreaBrief state={EMPTY_AREA_BRIEF} />}
                  hasBrief={false}
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
                <SensorGrid data={viewData ?? data} t={t} />
                <NewsTicker items={tickerItems} now={now} />
                <HealthWatchPanel data={viewData ?? data} t={t} />
              </Row>
              <Row name="b">
                <SignalCore data={viewData ?? data} t={t} />
                <NuclearWatch data={viewData ?? data} t={t} />
                <RiskGauges data={viewData ?? data} t={t} />
                <SweepDelta data={viewData ?? data} t={t} />
                <DisastersPanel data={viewData ?? data} t={t} />
                <OutagesPanel data={viewData ?? data} t={t} />
              </Row>
              <Row name="c">
                <RowC data={viewData ?? data} t={t} me={null} onGenerateIdeas={() => { /* snapshot: no paid calls */ }} />
              </Row>
              <Row name="d">
                <RowD data={viewData ?? data} t={t} />
              </Row>
              <Row name="e">
                <MarketsPanel data={viewData ?? data} t={t} />
              </Row>
            </main>
          </>
        )}
      <SignalGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </PageShell>
  );
}
