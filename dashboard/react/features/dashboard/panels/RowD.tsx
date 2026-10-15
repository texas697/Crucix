import { useState } from 'react';
import type { ReactNode } from 'react';
import type { SweepData } from '../../../api/types';
import type { Translator } from '../../../shared/locale';
import { safeExternalUrl } from '../../../shared/safeUrl';
import { getAge } from '../format';
import { Panel } from '../Panel';

// Row D of the dashboard grid, ported from renderRight() in jarvis.html (2647-2702, the four cards set
// at 2691-2696) plus their helpers: alertsHtml (2524-2533), threatHtml/threatByRegion (2456-2488),
// trackerHtml (2549-2562) and polyHtml (2491-2499). The shared Panel primitive supplies the legacy
// `.col-card > (.card-head + .card-body)` markup (cardHtml 1294) and each card keeps its legacy id and
// inline flex width (pAlerts 1 1 260px, pThreat 1 1 260px, pTracks 2 1 340px, pPoly 1 1 280px) so the
// ported CSS keeps applying.
//
// Three of these feeds are not part of the synthesized `/api/data` envelope: air-raid alerts come from
// a live `/api/alerts` poll, the drone/missile tracks from `/api/tracks`, and the prediction markets
// from Polymarket's gamma API. They arrive here via optional props (undefined means "not loaded yet"),
// exactly the way RowB's DisastersPanel takes the USGS list. Only the Regional threat card is fully
// derived from `data`.
//
// The legacy row interleaves a map-driven `currentRegion` global and a click-to-focus action; this
// port has no map/region state, so the threat card renders the `world` view (badge "All theaters") and
// its rows are not clickable (the legacy "· click to focus" hint is dropped). The threat algorithm is
// otherwise unchanged; because the synthesized fixtures store GDELT `byRegion` as a label → event-count
// map (`{"Europe":100}`) rather than the production per-theater `{events,types}` records, a numeric
// region value is normalised into the severe-event count so the composite still has signal (see
// regionGdelt below). Everything renders as React nodes; React escapes untrusted feed strings, so no
// innerHTML anywhere.

type Rec = Record<string, unknown>;
type Label = (key: string, fallback?: string) => string;

/** Coerce a loose record field to an object, or an empty one. */
function asRec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {};
}

/** Coerce a loose record field to an array of records. */
function asArr(value: unknown): Rec[] {
  return Array.isArray(value) ? (value as Rec[]) : [];
}

/** Coerce to a finite number, falling back to `d`. */
function num(value: unknown, d = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : d;
}

/** Coerce to a string, or ''. */
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Only call `t.has` when the translator actually exposes it (mirrors RowB/LeftRail). */
function hasKey(t: Translator | undefined, key: string): boolean {
  return !!t && typeof t.has === 'function' ? t.has(key) : false;
}

/** Legacy `t(key, fallback)`: the fallback (then the key) when the locale lacks the key. */
function makeLabel(t: Translator | undefined): Label {
  return (key, fallback) => (hasKey(t, key) ? t!(key) : (fallback ?? key));
}

// --- Shared props -----------------------------------------------------------------------------------

export interface RowDPanelProps {
  data: SweepData;
  t?: Translator;
}

/** One air-raid alert item from the live `/api/alerts` poll (server.mjs 646-674). */
export interface AlertItem {
  /** Unix seconds (as the live feed emits) or an ISO timestamp string. */
  time?: string;
  cities?: string[];
  drill?: boolean;
}

/** One drone/missile track from the live `/api/tracks` feed (server.mjs 630-642). */
export interface TrackItem {
  type?: string;
  locality?: string;
  region?: string;
  confidence?: number;
  sourceCount?: number;
  updatedAt?: string;
}

/** One Polymarket event (jarvis.html 2508-2516). */
export interface MarketItem {
  title?: string;
  yes?: number;
  vol?: number;
  slug?: string;
}

export interface AlertsPanelProps extends RowDPanelProps {
  /** Live alert feed; undefined means the poll has not returned yet. */
  alerts?: AlertItem[];
}

export interface TracksPanelProps extends RowDPanelProps {
  /** Live Neptun track feed; undefined means the stream is still connecting. */
  tracks?: TrackItem[];
}

export interface PredictionMarketsPanelProps extends RowDPanelProps {
  /** Polymarket conflict markets; undefined means the fetch is still loading. */
  markets?: MarketItem[];
}

export interface RowDProps extends RowDPanelProps {
  alerts?: AlertItem[];
  tracks?: TrackItem[];
  markets?: MarketItem[];
}

/**
 * The Row D group: air-raid alerts, regional threat, drone/missile tracker and prediction markets, in
 * legacy order (jarvis.html 743-748). Returns a fragment so a parent supplies the `<Row name="d">`
 * wrapper, matching how DashboardApp wraps RowC.
 */
export function RowD({ data, t, alerts, tracks, markets }: RowDProps) {
  return (
    <>
      <AlertsPanel data={data} t={t} alerts={alerts} />
      <ThreatPanel data={data} t={t} />
      <TracksPanel data={data} t={t} tracks={tracks} />
      <PredictionMarketsPanel data={data} t={t} markets={markets} />
    </>
  );
}

// --- Air-raid alerts (jarvis.html 2524-2533) --------------------------------------------------------

/** Resolve an alert's timestamp to epoch ms, tolerating unix-seconds or ISO strings. */
function alertMs(time: string | undefined): number | null {
  if (!time) return null;
  const s = time.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s) * 1000; // live feed emits unix seconds
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

/** One alert row (jarvis.html 2529): time, up to three cities (+N), optional drill tag. */
function AlertRow({ a }: { a: AlertItem }) {
  const cities = a.cities ?? [];
  const shown = cities.slice(0, 3);
  const extra = cities.length - 3;
  const ms = alertMs(a.time);
  const timeText = ms != null
    ? new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';
  return (
    <div className="alert-row">
      <span className="alert-time">{timeText}</span>
      <span className="alert-cities">{shown.join(', ')}{extra > 0 ? ` +${extra}` : ''}</span>
      {a.drill ? <span className="alert-drill">drill</span> : null}
    </div>
  );
}

export function AlertsPanel({ t, alerts }: AlertsPanelProps) {
  const tr = makeLabel(t);
  const [soundOn, setSoundOn] = useState(false);

  let badge: ReactNode;
  let body: ReactNode;
  if (!alerts) {
    // Legacy `if(!ALERTS)` while the poll is in flight.
    badge = 'loading';
    body = <div className="panel-src">Loading{'\u2026'}</div>;
  } else {
    const now = Date.now();
    const recent = alerts
      .filter((a) => {
        const ms = alertMs(a.time);
        return ms != null && now - ms < 3_600_000;
      })
      .slice(0, 10);
    badge = recent.length ? `${recent.length} in 1h` : 'Quiet';
    body = recent.length
      ? <>{recent.map((a, i) => <AlertRow key={i} a={a} />)}</>
      : <div className="panel-src" style={{ opacity: 0.7 }}>No active alerts in the last hour.</div>;
  }

  return (
    <Panel
      id="pAlerts"
      title={tr('panels.airRaidAlerts', 'Air-raid alerts')}
      badge={badge}
      flex="1 1 260px"
      headExtra={(
        <button
          type="button"
          className={`alerts-snd${soundOn ? ' on' : ''}`}
          onClick={() => setSoundOn((v) => !v)}
          title="Sound on new alerts"
        >
          {soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07'}
        </button>
      )}
    >
      {body}
    </Panel>
  );
}

// --- Regional threat (jarvis.html 2453-2488) --------------------------------------------------------

/** Theater priority: the Middle East box overlaps the others, so a point belongs to the first match. */
const THEATER_ORDER = ['middleEast', 'europe', 'africa', 'asiaPacific', 'americas'];
/** Region boxes, [[lonMin, latMin], [lonMax, latMax]] (jarvis.html 1081-1088). */
const REGION_BOX: Record<string, [[number, number], [number, number]] | null> = {
  world: null,
  americas: [[-168, -58], [-32, 72]],
  europe: [[-25, 33], [45, 72]],
  middleEast: [[24, 10], [65, 45]],
  asiaPacific: [[55, -15], [180, 60]],
  africa: [[-20, -36], [55, 38]],
};
/** Theater display labels (jarvis.html 1090). */
const REGION_LABEL: Record<string, string> = {
  world: 'World',
  americas: 'Americas',
  europe: 'Europe',
  middleEast: 'Middle East',
  asiaPacific: 'Asia Pacific',
  africa: 'Africa',
};
/** Scoring/rendering order (jarvis.html 2461). */
const THREAT_REGIONS = ['middleEast', 'europe', 'asiaPacific', 'americas', 'africa'];

function inRegionBox(lat: number, lon: number, region: string): boolean {
  const b = REGION_BOX[region];
  if (!b) return true;
  return lat >= b[0][1] && lat <= b[1][1] && lon >= b[0][0] && lon <= b[1][0];
}

function theaterOf(lat: number, lon: number): string | null {
  for (const r of THEATER_ORDER) if (inRegionBox(lat, lon, r)) return r;
  return null;
}

interface RegionGdelt {
  events: number;
  types: Rec;
  /** Event count when the fixture uses the label → number fallback shape. */
  count: number;
}

/**
 * Read one region's GDELT conflict data. Production `byRegion` is keyed by theater with
 * `{events, types}` records (apis/sources/gdelt.mjs 198-202); the synthesized fixtures instead store a
 * label → event-count map (`{"Europe":100}`), so fall back to the display-label key and treat the
 * number as that region's severe-event count.
 */
function regionGdelt(by: Rec, r: string): RegionGdelt {
  const direct = by[r];
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const rec = direct as Rec;
    return { events: num(rec.events), types: asRec(rec.types), count: 0 };
  }
  const label = REGION_LABEL[r];
  const alt = label != null ? by[label] : undefined;
  const count = typeof alt === 'number' ? alt : typeof direct === 'number' ? direct : 0;
  return { events: 0, types: {}, count };
}

/** Normalise a WHO outbreak's risk (legacy `o.risk?.max`, with a string fallback). */
function outbreakRisk(o: Rec): string {
  const risk = o.risk;
  if (typeof risk === 'string') return risk.toLowerCase();
  return str(asRec(risk).max).toLowerCase();
}

interface ThreatPart { k: string; n: number; pts: number; txt: string; }

interface ThreatRegion {
  r: string;
  label: string;
  score: number;
  level: string;
  color: string;
  events: number;
  severe: number;
  tip: string;
  parts: ThreatPart[];
}

/** Composite 0-100 threat per theater (jarvis.html 2460-2482). */
function threatByRegion(data: SweepData): ThreatRegion[] {
  const gdelt = asRec(data.gdelt);
  const by = asRec(gdelt.byRegion);
  const chokepoints = asArr(data.chokepoints);
  const outages = asArr(asRec(data.outages).countries);
  const disasters = asArr(asRec(data.disasters).events);
  const nuke = asArr(data.nuke);
  const outbreaks = asArr(asRec(data.healthWatch).outbreaks);
  const hours = num(asRec(gdelt.window).hours, 6) || 6;

  return THREAT_REGIONS.map((r) => {
    const g = regionGdelt(by, r);
    const types = g.types;
    const severe = num(types['Armed clash']) + num(types['Mass violence']) + num(types['Assault']);
    // Legacy weighted severe index; the fixture fallback has no type split, so its count stands in.
    let sev = num(types['Armed clash']) + 3 * num(types['Mass violence']) + 0.5 * num(types['Assault']);
    if (severe === 0 && g.count > 0) sev = g.count;
    const conflict = Math.min(60, Math.round(20 * Math.log10(1 + sev / 10)));

    const parts: ThreatPart[] = [];
    const cps = chokepoints.filter((c) => c.status === 'disrupted' && theaterOf(num(c.lat), num(c.lon)) === r);
    if (cps.length) parts.push({ k: 'chokepoints', n: cps.length, pts: Math.min(20, 12 * cps.length), txt: cps.map((c) => str(c.label)).join(', ') });
    const outs = outages.filter((c) => c.national && c.lat != null && theaterOf(num(c.lat), num(c.lon)) === r);
    if (outs.length) parts.push({ k: 'internet outages', n: outs.length, pts: Math.min(16, 8 * outs.length), txt: outs.map((c) => str(c.name)).join(', ') });
    const reds = disasters.filter((e) => e.level === 'Red' && theaterOf(num(e.lat), num(e.lon)) === r);
    if (reds.length) parts.push({ k: 'GDACS red', n: reds.length, pts: Math.min(12, 6 * reds.length), txt: reds.map((e) => str(e.name)).join(', ') });
    const nukes = nuke.filter((n) => n.anom && theaterOf(num(n.lat), num(n.lon)) === r);
    if (nukes.length) parts.push({ k: 'radiation', n: nukes.length, pts: 15, txt: nukes.map((n) => str(n.site)).join(', ') });
    const who = outbreaks.filter((o) => outbreakRisk(o) === 'very high'
      && (Array.isArray(o.pins) ? (o.pins as unknown[]) : []).some((p) => Array.isArray(p) && theaterOf(num(p[0]), num(p[1])) === r));
    if (who.length) parts.push({ k: 'WHO very high', n: who.length, pts: 8, txt: who.map((o) => str(o.disease)).join(', ') });

    const disruption = Math.min(40, parts.reduce((s, p) => s + p.pts, 0));
    const score = Math.min(100, conflict + disruption);
    const lvl: readonly [string, string] = score >= 60 ? ['Critical', '#ff6b74']
      : score >= 40 ? ['High', '#f59a5e']
        : score >= 20 ? ['Elevated', '#f2c879']
          : ['Guarded', '#7fe0c0'];
    const label = REGION_LABEL[r] ?? r;
    const events = g.events || g.count;
    const severeCount = severe || g.count;
    const tip = `${label} ${'\u00b7'} score ${score}: conflict ${conflict} (${severeCount} armed clash / mass violence / assault events of ${events} conflict events in the last ${hours}h)`
      + (parts.length ? `; ${parts.map((p) => `${p.k} +${p.pts} (${p.txt})`).join('; ')}` : '; no disruption signals');
    return { r, label, score, level: lvl[0], color: lvl[1], events, severe: severeCount, tip, parts };
  }).sort((a, b) => b.score - a.score);
}

/** One threat row (jarvis.html 2486): dot, theater, severe count (+disruption badge), level + score. */
function ThreatRow({ x }: { x: ThreatRegion }) {
  const nd = x.parts.reduce((s, p) => s + p.n, 0);
  return (
    <div className="threat-row" title={`${x.tip} ${'\u00b7'} hover for the breakdown`}>
      <span className="tdot" style={{ background: x.color }} />
      <span className="tname">{x.label}</span>
      <span className="tmeta">
        {x.severe.toLocaleString()} severe
        {nd
          ? <span className="tdisr" title={`${nd} disruption signal${nd === 1 ? '' : 's'}`}>{'\u26a0'} {nd}</span>
          : null}
      </span>
      <span className="tlevel" style={{ color: x.color }}>
        {x.level} <span style={{ opacity: 0.55, fontWeight: 400 }}>{x.score}</span>
      </span>
    </div>
  );
}

export function ThreatPanel({ data, t }: RowDPanelProps) {
  const tr = makeLabel(t);
  const rows = threatByRegion(data);
  const hours = num(asRec(asRec(data.gdelt).window).hours, 6) || 6;
  return (
    <Panel
      id="pThreat"
      title={tr('panels.regionalThreat', 'Regional threat')}
      badge="All theaters"
      flex="1 1 260px"
    >
      {rows.map((x) => <ThreatRow key={x.r} x={x} />)}
      <div className="panel-src">
        GDELT severe conflict events (last {hours}h, log-scaled) plus disrupted chokepoints, national
        internet outages, GDACS red alerts, radiation anomalies and WHO very-high outbreaks {'\u00b7'} hover
        for the breakdown
      </div>
    </Panel>
  );
}

// --- Drone & missile tracker (jarvis.html 2549-2562) ------------------------------------------------

/** Track type → colour (jarvis.html 2553). */
const TRACK_TYPE_COLOR: Record<string, string> = {
  fpv: '#f2c879', uav: '#f59a5e', missile: '#ff6b74', kab: '#b48cff', shahed: '#ff6b74',
};

/** One track row (jarvis.html 2557-2561). */
function TrackRow({ x }: { x: TrackItem }) {
  const type = str(x.type) || 'track';
  const col = TRACK_TYPE_COLOR[type.toLowerCase()] || '#ff9e6b';
  const age = x.updatedAt ? getAge(x.updatedAt) : '';
  return (
    <div className="track-row">
      <span className="track-type" style={{ color: col, borderColor: `${col}66` }}>{type.toUpperCase()}</span>
      <span className="track-loc">{str(x.locality)}{x.locality && x.region ? ', ' : ''}{str(x.region)}</span>
      <span className="track-meta">{x.confidence || ''} {'\u00b7'} {x.sourceCount || 1} src {'\u00b7'} {age}</span>
    </div>
  );
}

export function TracksPanel({ t, tracks }: TracksPanelProps) {
  const tr = makeLabel(t);
  const neptunHref = safeExternalUrl('https://neptun.in.ua/karta-shahediv') ?? undefined;

  let badge: string;
  let body: ReactNode;
  if (!tracks) {
    badge = 'connecting';
    body = <div className="panel-src">Connecting to Neptun{'\u2026'}</div>;
  } else if (!tracks.length) {
    badge = '0 live';
    body = <div className="panel-src" style={{ opacity: 0.7 }}>No active tracks.</div>;
  } else {
    badge = `${tracks.length} live`;
    body = (
      <>
        {tracks.slice(0, 10).map((x, i) => <TrackRow key={i} x={x} />)}
        <div className="panel-src">
          Live from <a href={neptunHref} target="_blank" rel="noopener">Neptun {'\u2197'}</a>
        </div>
      </>
    );
  }

  return (
    <Panel
      id="pTracks"
      title={tr('panels.droneMissileTracker', 'Drone & missile tracker')}
      badge={badge}
      flex="2 1 340px"
    >
      {body}
    </Panel>
  );
}

// --- Prediction markets (jarvis.html 2491-2499) -----------------------------------------------------

/** One Polymarket row: question, yes bar, percentage, 24h volume and outbound link. */
function MarketRow({ p }: { p: MarketItem }) {
  const pct = Math.round(num(p.yes) * 100);
  const vol = num(p.vol);
  const volText = vol >= 1000 ? `${Math.round(vol / 1000)}k` : `${Math.round(vol)}`;
  const href = safeExternalUrl(`https://polymarket.com/event/${str(p.slug)}`) ?? undefined;
  return (
    <a className="poly-item" href={href} target="_blank" rel="noopener">
      <span className="poly-q">{str(p.title)}</span>
      <span className="poly-bar"><span style={{ width: `${Math.max(2, pct)}%` }} /></span>
      <span className="poly-meta"><b>{pct}%</b> yes {'\u00b7'} {'$'}{volText} 24h</span>
    </a>
  );
}

export function PredictionMarketsPanel({ t, markets }: PredictionMarketsPanelProps) {
  const tr = makeLabel(t);
  let body: ReactNode;
  if (!markets) {
    body = <div className="panel-src">Loading{'\u2026'}</div>;
  } else if (!markets.length) {
    body = <div className="panel-src">No conflict markets right now.</div>;
  } else {
    body = markets.map((p, i) => <MarketRow key={i} p={p} />);
  }
  return (
    <Panel
      id="pPoly"
      title={tr('panels.predictionMarkets', 'Prediction markets')}
      badge="Polymarket"
      flex="1 1 280px"
    >
      {body}
    </Panel>
  );
}
