// Pure marker/GeoJSON selector, ported faithfully from `plotMarkers()` in `dashboard/public/jarvis.html`
// (1931-2187) plus its helpers: `ptFeat` (1820-1824), `severeGdelt`/`gdeltSeverity` (1472-1473), the
// `seenMarkers` diffing (2144-2152), the aggregate labels (2155-2160), the conflict rings (2162-2170),
// the track trails (2174-2181), `magColor` (2584), `getAge` (2706), `esc`/`cleanText` (2707-2708),
// `HEALTH_RISK_COL` (2759), `CDC_LEVEL_LABEL` (2761), `DISASTER_ICON` (2587) and the ships tables
// (1998-2000).
//
// This module is deliberately free of any `maplibre-gl` import: it turns the sweep payload plus the
// live feeds into the three GeoJSON FeatureCollections the map consumes (`src-points`, `src-rings`,
// `src-trails`), the label list, the per-layer counts and the new-marker bookkeeping. MapLibre only
// ever sees the output data.
//
// The legacy read module-level globals (`D`, `layerVisible`, `currentRegion`, `timeWindow`,
// `showAggregates`, `seenMarkers`, `SHIPS`, `TRACKS`, `QUAKES`); every one is an explicit argument here.
// `Date.now()` calls are threaded through the `now` input so the function stays deterministic.

import type * as GeoJSON from 'geojson';
import * as satellite from 'satellite.js';
import type { SweepData } from '../../api/types';
import { passesLayer } from './layerDefs';
import {
  inActiveRegion,
  inRegionBox,
  REGION_CENTROID,
  REGION_LABEL,
  type RegionKey,
} from './regions';

type LooseRecord = Record<string, unknown>;

// ─── Loose row shapes for the live feeds (mirroring the server payloads) ────────────────────────

/** One `/api/tracks` row (server.mjs 630-642). */
export interface TrackRow {
  lat: number;
  lon: number;
  type?: string;
  title?: string;
  region?: string;
  locality?: string;
  heading?: number;
  confidence?: number | string;
  sourceCount?: number;
  updatedAt?: string;
  uncertaintyKm?: number;
  trail?: { lat: number; lng: number }[];
  explanation?: string;
  [key: string]: unknown;
}

/** One `/api/ais` vessel (lib/ais/stream.mjs `aisSnapshot`). */
export interface ShipRow {
  lat: number;
  lon: number;
  mmsi?: number | string;
  name?: string;
  cls?: string;
  sog?: number | null;
  cog?: number | null;
  nav?: number | null;
  dest?: string | null;
  len?: number | null;
  box?: string | null;
  ts?: string;
  [key: string]: unknown;
}

/** One `<T> ships/day` box aggregate the chokepoint popups read (`SHIPS.boxes[id]`). */
export interface ShipBox {
  label?: string;
  vessels?: number;
  tanker?: number;
  anchored?: number;
  military?: number;
  [key: string]: unknown;
}

/** One USGS quake row (`reshapeQuakes`, useLiveFeeds.ts). */
export interface QuakeRow {
  lat: number;
  lon: number;
  id?: string;
  mag?: number;
  place?: string;
  depth?: number | null;
  ts?: string | null;
  url?: string | null;
  tsunami?: number | boolean | null;
  [key: string]: unknown;
}

/** The live-feed slices `plotData` needs beyond the sweep payload. */
export interface PlotShips {
  vessels?: ShipRow[];
  /** PortWatch box aggregates keyed by chokepoint id, legacy `SHIPS.boxes`. */
  boxes?: Record<string, ShipBox>;
}

export interface PlotTracks {
  tracks?: TrackRow[];
}

/** A plotted marker, exactly the loose record `ptFeat` consumes. */
export interface MapPoint {
  lat: number;
  lng: number;
  size: number;
  _r: number;
  color: string;
  _stroke: string;
  type: string;
  priority: number;
  ts?: string;
  url?: string;
  popHead: string;
  popMeta: string;
  popText: string;
  _sat?: number;
  _id?: string;
  _new?: boolean;
}

export interface PlotInput {
  data: SweepData;
  layerVisible: Record<string, boolean>;
  region: string;
  timeWindow: 'all' | '1h' | '24h' | '7d';
  now?: number;
  /** `null` means this is the first plot (nothing is marked `_new`). */
  seenMarkers: Set<string> | null;
  showAggregates: boolean;
  tracks?: PlotTracks | null;
  ships?: PlotShips | null;
  quakes?: QuakeRow[] | null;
}

export interface PlotLabel {
  text: string;
  lng: number;
  lat: number;
  region?: string;
  aggregate?: boolean;
}

export interface PlotResult {
  points: GeoJSON.FeatureCollection;
  rings: GeoJSON.FeatureCollection;
  trails: GeoJSON.FeatureCollection;
  labels: PlotLabel[];
  layerCounts: Record<string, number>;
  nextSeen: Set<string>;
  mapPoints: MapPoint[];
}

// ─── Small pure helpers (legacy 1472-1474, 2584, 2587, 2706-2708, 2759-2761) ────────────────────

const asRec = (v: unknown): LooseRecord =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as LooseRecord) : {};
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const recs = (v: unknown): LooseRecord[] =>
  asArr(v).filter((r): r is LooseRecord => !!r && typeof r === 'object' && !Array.isArray(r));
const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const bool = (v: unknown): boolean => v === true;
const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanText(t: unknown): string {
  return esc(
    String(t ?? '')
      .replace(/&#39;/g, "'")
      .replace(/&#33;/g, '!')
      .replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, ''),
  );
}

function relTime(iso: unknown, now: number): string {
  const m = Math.round((now - new Date(String(iso)).getTime()) / 60000);
  if (!isFinite(m) || m < 0) return '';
  if (m < 60) return m + 'm ago';
  if (m < 48 * 60) return Math.round(m / 60) + 'h ago';
  return Math.round(m / 1440) + 'd ago';
}

function getAge(d: unknown, now: number): string {
  const ms = now - new Date(String(d)).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function magColor(m: number): string {
  return m >= 6 ? '#ff5f63' : m >= 5 ? '#ff8a5c' : m >= 4 ? '#ffa94d' : '#f2c879';
}

const GDELT_SEVERITY: Record<string, number> = {
  'Mass violence': 6,
  'Armed clash': 5,
  Assault: 4,
  Coercion: 3,
  'Force posture': 2,
  Protest: 1,
};
function gdeltSeverity(t: unknown): number {
  return GDELT_SEVERITY[str(t)] || 0;
}

function fmtUsvh(v: unknown): string {
  const n = numOrNull(v);
  return n == null ? '--' : (n < 0.01 ? '<0.01' : n.toFixed(2)) + ' µSv/h';
}

const DISASTER_ICON: Record<string, string> = {
  EQ: '\u25B2',
  TC: '\uD83C\uDF00',
  FL: '\u2248',
  VO: '\u25B3',
  DR: '\u2600',
  WF: '\uD83D\uDD25',
};

const HEALTH_RISK_COL: Record<string, string> = {
  'very high': 'rgba(255,107,116,0.85)',
  high: 'rgba(245,154,94,0.85)',
  moderate: 'rgba(242,200,121,0.85)',
  low: 'rgba(127,224,192,0.7)',
};

const CDC_LEVEL_LABEL: Record<number, string> = {
  1: 'Usual precautions',
  2: 'Enhanced precautions',
  3: 'Reconsider travel',
  4: 'Avoid travel',
};

const SHIP_COL: Record<string, string> = {
  tanker: 'rgba(245,190,90,0.9)',
  cargo: 'rgba(127,200,255,0.85)',
  passenger: 'rgba(200,160,255,0.9)',
  military: 'rgba(255,107,116,0.95)',
  law: 'rgba(255,107,116,0.95)',
  fishing: 'rgba(127,224,192,0.75)',
  tug: 'rgba(180,180,190,0.7)',
  service: 'rgba(180,180,190,0.7)',
  pleasure: 'rgba(180,180,190,0.55)',
  highspeed: 'rgba(200,160,255,0.7)',
  other: 'rgba(160,170,190,0.6)',
  unknown: 'rgba(140,150,170,0.5)',
};

const SHIP_LABEL: Record<string, string> = {
  tanker: 'Tanker',
  cargo: 'Cargo ship',
  passenger: 'Passenger ship',
  military: 'Military vessel',
  law: 'Law enforcement',
  fishing: 'Fishing vessel',
  tug: 'Tug / towing',
  service: 'Service vessel',
  pleasure: 'Pleasure craft',
  highspeed: 'High-speed craft',
  other: 'Vessel',
  unknown: 'Vessel (type unknown)',
};

const NAV_LABEL: Record<number, string> = {
  0: 'under way',
  1: 'at anchor',
  2: 'not under command',
  3: 'restricted manoeuvrability',
  4: 'constrained by draught',
  5: 'moored',
  6: 'aground',
  7: 'fishing',
  8: 'sailing',
};

/** WHO risk is `{ max, national, regional, global }` live but a bare string in the fixtures. */
function riskMax(risk: unknown): string {
  return typeof risk === 'string' ? risk : str(asRec(risk).max);
}

// ─── Space propagation (jarvis.html 1872-1897) ──────────────────────────────────────────────────

interface SatPos {
  lat: number;
  lon: number;
  alt: number | null;
  vel: number | null;
  live?: boolean;
}

function satrecFor(st: LooseRecord, cache: Map<string, satellite.SatRec | null>): satellite.SatRec | null {
  const key = str(st.noradId) + '|' + str(st.epoch);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let rec: satellite.SatRec | null = null;
  try {
    const omm = st.omm;
    if (omm && typeof omm === 'object' && Object.keys(omm).length) {
      rec = satellite.json2satrec(omm as never);
    } else if (Array.isArray(st.tle) && st.tle.length >= 2) {
      rec = satellite.twoline2satrec(String(st.tle[0]), String(st.tle[1]));
    }
  } catch {
    rec = null;
  }
  cache.set(key, rec);
  return rec;
}

function satPosition(
  st: LooseRecord,
  when: Date,
  cache: Map<string, satellite.SatRec | null>,
): SatPos | null {
  const rec = satrecFor(st, cache);
  if (!rec) return null;
  try {
    const pv = satellite.propagate(rec, when) as unknown as {
      position?: unknown;
      velocity?: unknown;
    } | null;
    const position = pv?.position;
    if (!position || typeof position !== 'object') return null;
    const velocity = pv?.velocity;
    const vel =
      velocity && typeof velocity === 'object'
        ? Math.hypot(
            (velocity as { x: number }).x,
            (velocity as { y: number }).y,
            (velocity as { z: number }).z,
          ) * 3600
        : null;
    const geo = satellite.eciToGeodetic(
      position as { x: number; y: number; z: number },
      satellite.gstime(when),
    );
    return {
      lat: +satellite.degreesLat(geo.latitude).toFixed(2),
      lon: +satellite.degreesLong(geo.longitude).toFixed(2),
      alt: Math.round(geo.height),
      vel: vel ? Math.round(vel) : null,
      live: true,
    };
  } catch {
    return null;
  }
}

// ─── Feature builders (jarvis.html 1820-1852) ───────────────────────────────────────────────────

function ptFeat(p: MapPoint): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {
      head: p.popHead || '',
      text: p.popText || '',
      meta: p.popMeta || '',
      url: p.url || '',
      isNew: p._new ? '1' : '0',
      color: p.color || '#dce2ec',
      stroke: p._stroke || 'rgba(0,0,0,0.4)',
      r: Math.max(2.5, Math.min(16, p._r != null ? p._r : (p.size || 0.3) * 12)),
    },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  };
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

// ─── The port ───────────────────────────────────────────────────────────────────────────────────

/**
 * Build the map's points/rings/trails/labels/counts from the sweep payload and the live feeds.
 * Pure: same inputs (including `now`) always produce the same output.
 */
export function plotData(input: PlotInput): PlotResult {
  const now = input.now ?? Date.now();
  const D = input.data as unknown as LooseRecord;
  const points: MapPoint[] = [];
  const internalLabels: InternalLabel[] = [];

  // === Air hotspots (1935-1943) ===
  const airCoords = [
    { lat: 30, lon: 44 },
    { lat: 24, lon: 120 },
    { lat: 49, lon: 32 },
    { lat: 57, lon: 24 },
    { lat: 14, lon: 114 },
    { lat: 37, lon: 127 },
    { lat: 25, lon: -80 },
    { lat: 4, lon: 2 },
    { lat: -34, lon: 18 },
    { lat: 10, lon: 51 },
  ];
  recs(D.air).forEach((a, i) => {
    const c = airCoords[i];
    if (!c) return;
    const total = num(a.total);
    const coverage = str(a.coverage);
    const sampledAt = optStr(a.sampledAt);
    const top =
      esc(
        asArr(a.top)
          .slice(0, 3)
          .map((t) => {
            const tt = asArr(t);
            return tt[0] + ' (' + tt[1] + ')';
          })
          .join(', '),
      ) || '--';
    points.push({
      lat: c.lat,
      lng: c.lon,
      size: 0.3,
      _r: 4 + Math.min(total / 40, 10),
      color: 'rgba(127,224,192,0.85)',
      _stroke: 'rgba(127,224,192,0.35)',
      type: 'air',
      priority: 1,
      popHead: str(a.region),
      popMeta: `Air Activity · ${total} aircraft · ${
        coverage === 'sampled'
          ? 'sampled via adsb.lol' + (sampledAt ? ' ' + relTime(sampledAt, now) : '')
          : 'via ' + (str(a.via) || 'OpenSky')
      } · marker at theater centre`,
      popText: `${total} aircraft tracked${
        num(a.military) ? ` · <b>${num(a.military)} military</b>` : ''
      }<br>No callsign: ${num(a.noCallsign)}<br>Above FL390: ${num(a.highAlt)}<br>Top: ${top}${
        a.note ? '<br><span style="opacity:.7">' + esc(a.note) + '</span>' : ''
      }`,
    });
    internalLabels.push({
      lat: c.lat,
      lng: c.lon,
      text: str(a.region).replace(' Region', '') + ' ' + total,
      type: 'air',
    });
  });

  // === Military aircraft (1945-1951) ===
  recs(D.milAir).forEach((m) => {
    const alt = numOrNull(m.alt);
    const fl = alt != null ? (alt <= 0 ? 'on ground' : 'FL' + String(Math.round(alt / 100)).padStart(3, '0')) : 'alt n/a';
    const gs = numOrNull(m.gs);
    const trk = numOrNull(m.trk);
    points.push({
      lat: num(m.lat),
      lng: num(m.lon),
      size: 0.22,
      _r: 3.4,
      color: 'rgba(143,167,255,0.95)',
      _stroke: 'rgba(143,167,255,0.35)',
      type: 'air',
      priority: 2,
      popHead: (str(m.cs) || str(m.hex).toUpperCase()) + (m.type ? ' · ' + str(m.type) : ''),
      popMeta: `Military aircraft · ${str(m.country)} · ${fl}`,
      popText:
        [
          m.reg ? 'Reg ' + esc(m.reg) : '',
          gs != null ? gs + ' kt' : '',
          trk != null ? 'hdg ' + trk + '°' : '',
          m.sq ? 'squawk ' + esc(m.sq) : '',
        ]
          .filter(Boolean)
          .join(' · ') +
        `<br><span style="opacity:.7">Live ADS-B via adsb.lol · ICAO ${esc(m.hex)}</span>`,
    });
  });

  // === Thermal / fire (1953-1958) ===
  recs(D.thermal).forEach((t) => {
    recs(t.fires).forEach((f) => {
      const frp = num(f.frp);
      const at = optStr(f.at);
      points.push({
        lat: num(f.lat),
        lng: num(f.lon),
        size: 0.12 + Math.min(frp / 200, 0.3),
        _r: 2.5 + Math.min(frp / 40, 5),
        color: 'rgba(255,107,116,0.75)',
        _stroke: 'rgba(255,107,116,0.25)',
        type: 'thermal',
        priority: 3,
        ts: at,
        popHead: `Thermal detection · ${frp.toFixed(0)} MW`,
        popMeta: `NASA FIRMS${f.sat ? ' · ' + str(f.sat) : ''}${f.night ? ' · night' : ''}${
          at ? ' · ' + relTime(at, now) : ''
        }`,
        popText: `${esc(t.region)}${f.conf ? ` · ${esc(f.conf)} confidence` : ''}<br>Fire radiative power ${frp.toFixed(
          1,
        )} MW${at ? `<br>Detected ${at.slice(0, 16).replace('T', ' ')} UTC` : ''}<br><span style="opacity:.7">Region 24 h: ${num(
          t.det,
        ).toLocaleString()} detections · ${num(t.night).toLocaleString()} at night · ${num(
          t.hi,
        ).toLocaleString()} above 10 MW</span>`,
      });
    });
  });

  // === Maritime chokepoints (1960-1973) ===
  const shipBoxes = input.ships?.boxes;
  recs(D.chokepoints).forEach((cp) => {
    const status = str(cp.status);
    const col =
      status === 'disrupted'
        ? 'rgba(255,107,116,0.95)'
        : status === 'reduced'
          ? 'rgba(245,154,94,0.9)'
          : status === 'watch'
            ? 'rgba(233,201,160,0.9)'
            : status === 'elevated'
              ? 'rgba(127,224,192,0.9)'
              : cp.major
                ? 'rgba(180,140,255,0.85)'
                : 'rgba(180,140,255,0.5)';
    const pctN = numOrNull(cp.pct);
    const pct = pctN != null ? `${pctN > 0 ? '+' : ''}${pctN}% vs 1-yr avg` : '';
    const trendN = numOrNull(cp.trend);
    const trend = trendN != null ? ` · week ${trendN > 0 ? '+' : ''}${trendN}%` : '';
    const ev = recs(cp.events).find((e) => bool(e.ongoing));
    const perDay = numOrNull(cp.perDay);
    const id = str(cp.id);
    const lb = (shipBoxes && id ? shipBoxes[id] : undefined) || (cp.live ? asRec(cp.live) : null);
    const livePart =
      lb && num(lb.vessels)
        ? `<br><span style="color:var(--sky)">Live now: ${num(lb.vessels)} ships</span> · ${num(
            lb.tanker,
          )} tankers · ${num(lb.anchored)} stopped/at anchor${
            num(lb.military)
              ? ` · <span style="color:var(--danger)">${num(lb.military)} military/law</span>`
              : ''
          }`
        : '';
    const tankerN = numOrNull(cp.tanker);
    const text =
      perDay != null
        ? `<b>${perDay} ships/day</b> (7-day) · 1-yr avg ${cp.base ?? '--'}${pct ? '<br>' + pct : ''}${trend}${
            tankerN != null ? `<br>Tankers ${tankerN}% of transits` : ''
          }${livePart}${
            ev
              ? `<br><span style="color:var(--danger)">&#9888; ${esc(ev.name)} since ${esc(ev.from || '')}</span>`
              : ''
          }${cp.note ? `<br><span style="opacity:.7">${esc(cp.note)}</span>` : ''}${
            cp.asOf ? `<br><span style="opacity:.6">Data to ${esc(cp.asOf)} · IMF PortWatch</span>` : ''
          }`
        : esc(cp.note || 'No transit data');
    const statusLabel =
      {
        disrupted: 'DISRUPTED',
        reduced: 'Reduced traffic',
        watch: 'Event open · traffic normal',
        elevated: 'Elevated traffic',
        normal: 'Normal traffic',
      }[status] || 'Chokepoint';
    points.push({
      lat: num(cp.lat),
      lng: num(cp.lon),
      size: cp.major ? 0.35 : 0.22,
      _r: cp.major ? 5 : 3.2,
      color: col,
      _stroke: 'rgba(180,140,255,0.3)',
      type: 'maritime',
      priority: status === 'disrupted' ? 1 : cp.major ? 1 : 3,
      ts: cp.asOf ? str(cp.asOf) + 'T12:00:00Z' : undefined,
      popHead: str(cp.label),
      popMeta: `Maritime chokepoint · ${statusLabel}`,
      popText: text,
    });
    if (cp.major || status === 'disrupted') {
      internalLabels.push({
        lat: num(cp.lat),
        lng: num(cp.lon),
        text:
          str(cp.label).replace(' Strait', '').replace('Strait of ', '') +
          (perDay != null ? ' ' + Math.round(perDay) : ''),
        type: 'maritime',
      });
    }
  });

  // === Nuclear sites + live radiation sensors (1975-1995) ===
  const nukeFallback: Record<string, { lat: number; lon: number }> = {
    zaporizhzhia: { lat: 47.51, lon: 34.58 },
    chernobyl: { lat: 51.39, lon: 30.1 },
    bushehr: { lat: 28.83, lon: 50.89 },
    yongbyon: { lat: 39.8, lon: 125.75 },
    fukushima: { lat: 37.42, lon: 141.03 },
    dimona: { lat: 31.0, lon: 35.15 },
  };
  const nukeMeta = asRec(D.nukeMeta);
  recs(D.nuke).forEach((n) => {
    const fb = nukeFallback[str(n.key)];
    const lat = numOrNull(n.lat) ?? fb?.lat;
    const lon = numOrNull(n.lon) ?? fb?.lon;
    if (lat == null || lon == null) return;
    const live = str(n.coverage) === 'live';
    const anom = bool(n.anom);
    const hot = num(n.hot);
    const radiusKm = num(n.radiusKm);
    const nearest = n.nearest ? asRec(n.nearest) : null;
    const last = optStr(n.last);
    const alertUsvh = numOrNull(n.alertUsvh);
    const color = anom ? 'rgba(255,107,116,0.95)' : live ? 'rgba(242,200,121,0.9)' : 'rgba(242,200,121,0.45)';
    const text = live
      ? `Status: <b>${
          anom ? 'ANOMALY' : hot ? 'Normal · ' + hot + ' hot sensor' + (hot > 1 ? 's' : '') : 'Normal'
        }</b><br>Median: ${Math.round(num(n.cpm))} CPM · ${fmtUsvh(n.usvh)}<br>Max: ${
          n.maxCpm != null ? Math.round(num(n.maxCpm)) + ' CPM · ' : ''
        }${fmtUsvh(n.maxUsvh)}<br>${num(n.n)} live sensors within ${radiusKm} km${
          nearest
            ? `<br>Nearest: ${esc(nearest.name)} (${num(nearest.distanceKm)} km) ${Math.round(num(nearest.cpm))} CPM`
            : ''
        }${last ? `<br>Latest reading ${relTime(last, now)}` : ''}${
          n.note ? `<br><span style="opacity:0.7">${esc(n.note)}</span>` : ''
        }`
      : str(n.coverage) === 'none'
        ? `No public radiation sensors within ${radiusKm} km.${
            n.note ? '<br><span style="opacity:0.7">' + esc(n.note) + '</span>' : ''
          }`
        : `No live sensor readings within ${radiusKm} km in the last ${num(nukeMeta.windowDays) || 30} days${
            last ? `<br>Last known reading: ${new Date(last).toISOString().slice(0, 10)}` : ''
          }`;
    points.push({
      lat,
      lng: lon,
      size: 0.3,
      _r: 4.5,
      color,
      _stroke: 'rgba(242,200,121,0.3)',
      type: 'nuke',
      priority: 2,
      ts: last,
      popHead: str(n.site),
      popMeta: 'Nuclear site · Safecast live sensors',
      popText: text,
    });
    recs(n.sensors).forEach((r) => {
      const rlat = numOrNull(r.lat);
      const rlon = numOrNull(r.lon);
      if (rlat == null || rlon == null) return;
      const usvh = numOrNull(r.usvh);
      const rHot = alertUsvh != null && usvh != null && usvh > alertUsvh;
      const at = optStr(r.at);
      points.push({
        lat: rlat,
        lng: rlon,
        size: 0.14,
        _r: 2.4,
        color: rHot ? 'rgba(255,107,116,0.9)' : 'rgba(242,200,121,0.6)',
        _stroke: 'rgba(242,200,121,0.2)',
        type: 'nuke',
        priority: 3,
        ts: at,
        popHead: esc(str(r.name) || 'Radiation sensor'),
        popMeta: `Safecast sensor · ${num(r.km)} km from ${esc(str(n.site).replace(/ \(.*\)$/, ''))}`,
        popText: `${Math.round(num(r.cpm))} CPM · ${fmtUsvh(usvh)}${
          rHot ? ' · <b>above ' + alertUsvh + ' µSv/h</b>' : ''
        }<br>${esc(r.tube || '')}${at ? ` · ${relTime(at, now)}` : ''}`,
      });
    });
  });

  // === Live ships (AIS) around the chokepoints (1997-2009) ===
  (input.ships?.vessels || []).forEach((v) => {
    const vlat = numOrNull(v.lat);
    const vlon = numOrNull(v.lon);
    if (vlat == null || vlon == null) return;
    const cls = v.cls || 'unknown';
    const big = cls === 'tanker' || cls === 'military' || cls === 'law' || cls === 'passenger';
    const boxLabel = v.box && shipBoxes && shipBoxes[v.box] ? str(shipBoxes[v.box]?.label) : '';
    const nav = numOrNull(v.nav);
    const sog = numOrNull(v.sog);
    const cog = numOrNull(v.cog);
    const stopped = nav === 1 || nav === 5 || (sog != null && sog < 0.5);
    const ts = optStr(v.ts);
    points.push({
      lat: vlat,
      lng: vlon,
      size: big ? 0.16 : 0.11,
      _r: big ? 2.6 : 2,
      color: SHIP_COL[cls] || SHIP_COL.unknown!,
      _stroke: 'rgba(127,200,255,0.2)',
      type: 'ships',
      priority: cls === 'military' || cls === 'law' ? 2 : 3,
      ts,
      popHead: v.name || 'MMSI ' + str(v.mmsi),
      popMeta: `${SHIP_LABEL[cls] || 'Vessel'}${boxLabel ? ' · ' + esc(boxLabel) : ''}${
        ts ? ' · ' + relTime(ts, now) : ''
      }`,
      popText: `${sog != null ? `${sog.toFixed(1)} kn` : 'speed --'}${
        cog != null ? ` · course ${cog}°` : ''
      }${nav != null && NAV_LABEL[nav] ? ` · ${NAV_LABEL[nav]}` : stopped ? ' · stopped' : ''}${
        v.dest ? `<br>Bound for ${esc(v.dest)}` : ''
      }${v.len ? `<br>Length ${num(v.len)} m` : ''}<br><span style="opacity:.65">MMSI ${str(
        v.mmsi,
      )} · AIS via aisstream.io</span>`,
    });
  });

  // === SDR receivers (2011-2028) ===
  const sdr = asRec(D.sdr);
  const sdrLiveUrls = new Set<string>();
  recs(sdr.zones).forEach((z) => {
    recs(z.receivers).forEach((r) => {
      const rlat = numOrNull(r.lat);
      const rlon = numOrNull(r.lon);
      if (rlat == null && rlon == null) return;
      const url = str(r.url);
      if (url) sdrLiveUrls.add(url);
      const liveState = str(r.live);
      const on = liveState === 'online';
      const priv = liveState === 'private';
      const down = liveState === 'unreachable' || liveState === 'offline';
      const col = on
        ? 'rgba(106,168,255,0.85)'
        : priv
          ? 'rgba(106,168,255,0.45)'
          : down
            ? 'rgba(150,150,160,0.5)'
            : 'rgba(106,168,255,0.6)';
      const state = on ? 'Online' : priv ? 'Private' : down ? 'Unreachable' : 'Listed';
      const maxUsers = numOrNull(r.max);
      const load = maxUsers ? `${num(r.users)}/${maxUsers} channels in use` : '';
      points.push({
        lat: num(rlat),
        lng: num(rlon),
        size: on ? 0.2 : 0.15,
        _r: on ? 3.2 : 2.5,
        color: col,
        _stroke: 'rgba(106,168,255,0.2)',
        type: 'sdr',
        priority: on ? 2 : 3,
        url: url || undefined,
        popHead: (str(r.name) || 'KiwiSDR receiver').replace(/\s*\|\s*/g, ' · '),
        popMeta: `KiwiSDR · ${state}${r.country ? ' · ' + esc(r.country) : ''}`,
        popText: `${esc(z.region)}${load ? '<br>' + load : ''}${
          r.snr != null ? `<br>HF signal-to-noise ${num(r.snr)} dB` : ''
        }${r.ant ? `<br>Antenna: ${esc(r.ant)}` : ''}${
          r.hw
            ? `<br><span style="opacity:.7">${esc(r.hw)}${r.gps ? ' · GPS-timed (TDoA capable)' : ''}</span>`
            : ''
        }`,
      });
    });
  });
  asArr(sdr.all).forEach((a) => {
    const tup = asArr(a);
    const name = tup[0];
    const lat = numOrNull(tup[1]);
    const lon = numOrNull(tup[2]);
    const country = tup[3];
    const url = str(tup[4]);
    if (lat == null || lon == null || (url && sdrLiveUrls.has(url))) return;
    points.push({
      lat,
      lng: lon,
      size: 0.1,
      _r: 1.8,
      color: 'rgba(106,168,255,0.35)',
      _stroke: 'rgba(106,168,255,0.12)',
      type: 'sdr',
      priority: 3,
      url: url || undefined,
      popHead: (str(name) || 'KiwiSDR receiver').replace(/\s*\|\s*/g, ' · '),
      popMeta: `KiwiSDR · listed${country ? ' · ' + esc(country) : ''}`,
      popText: 'Public HF receiver, 0–30 MHz. Live status is only probed inside the watched regions.',
    });
  });

  // === Disasters: GDACS Orange/Red (2030-2036) ===
  recs(asRec(D.disasters).events).forEach((e) => {
    const elat = numOrNull(e.lat);
    const elon = numOrNull(e.lon);
    if (elat == null || elon == null) return;
    const red = str(e.level) === 'Red';
    const col = red ? 'rgba(255,107,116,0.85)' : 'rgba(255,138,92,0.8)';
    const countries = asArr(e.countries);
    const from = optStr(e.from);
    const to = optStr(e.to);
    points.push({
      lat: elat,
      lng: elon,
      size: red ? 0.35 : 0.25,
      _r: red ? 5.4 : 4.2,
      color: col,
      _stroke: col.replace(/[\d.]+\)$/, '0.25)'),
      type: 'disaster',
      priority: 1,
      ts: to || from,
      url: optStr(e.url),
      popHead: `${DISASTER_ICON[str(e.type)] || ''} ${str(e.name)}`,
      popMeta: `GDACS ${str(e.level)} · ${str(e.typeLabel)}${e.current ? ' · ongoing' : ''}${
        countries.length > 1 ? ' · ' + countries.length + ' countries' : ''
      }`,
      popText: `${e.sev ? esc(e.sev) + '. ' : ''}${from ? 'From ' + esc(from.slice(0, 10)) : ''}${
        to ? ' to ' + esc(to.slice(0, 10)) : ''
      }.`,
    });
  });

  // === Internet outages: IODA country rows + Cloudflare Radar (2037-2052) ===
  const outages = asRec(D.outages);
  const passesOutage = (c: LooseRecord): boolean =>
    numOrNull(c.lat) != null && !!(bool(c.national) || bool(c.minor) || num(c.regions) >= 2 || num(c.asns) >= 3);
  recs(outages.countries).forEach((c) => {
    const clat = numOrNull(c.lat);
    const clon = numOrNull(c.lon);
    if (clat == null || clon == null) return;
    if (!bool(c.national) && !bool(c.minor) && num(c.regions) < 2 && num(c.asns) < 3) return;
    const national = bool(c.national);
    const col = national ? 'rgba(192,132,252,0.9)' : 'rgba(192,132,252,0.45)';
    const drop = numOrNull(c.drop);
    const regions = num(c.regions);
    const asns = num(c.asns);
    const sources = asArr(c.sources);
    const since = optStr(c.since);
    points.push({
      lat: clat,
      lng: clon,
      size: national ? 0.3 : 0.15,
      _r: national ? 5 : 3,
      color: col,
      _stroke: col.replace(/[\d.]+\)$/, '0.25)'),
      type: 'outage',
      priority: national ? 1 : 3,
      ts: since,
      popHead: `${str(c.name)} internet`,
      popMeta: `IODA · ${
        national ? 'national disruption' : bool(c.minor) ? 'minor dip' : 'sub-national alerts'
      }${drop != null ? ' · ' + drop + '% below baseline' : ''}`,
      popText: `${c.cause ? '<b>Cloudflare:</b> ' + esc(c.cause) + '<br>' : ''}${
        sources.length ? 'Signals: ' + esc(sources.join(', ')) + '. ' : ''
      }${regions ? regions + ' region alert' + (regions === 1 ? '' : 's') + '. ' : ''}${
        asns ? asns + ' network alert' + (asns === 1 ? '' : 's') + '. ' : ''
      }${since ? 'Since ' + relTime(since, now) + '.' : ''}`,
    });
  });
  const iodaPinned = new Set(
    recs(outages.countries)
      .filter(passesOutage)
      .map((c) => str(c.cc)),
  );
  recs(asRec(outages.radar).annotations).forEach((a) => {
    const alat = numOrNull(a.lat);
    const cc = asArr(a.cc);
    const cc0 = str(cc[0]);
    if (alat == null || !cc0 || iodaPinned.has(cc0)) return;
    iodaPinned.add(cc0);
    const active = bool(a.active);
    const col = active ? 'rgba(192,132,252,0.9)' : 'rgba(192,132,252,0.5)';
    const names = asArr(a.names);
    const cause = str(a.cause);
    const end = optStr(a.end);
    const start = optStr(a.start);
    points.push({
      lat: alat,
      lng: num(a.lon),
      size: active ? 0.3 : 0.15,
      _r: active ? 5 : 3.2,
      color: col,
      _stroke: col.replace(/[\d.]+\)$/, '0.25)'),
      type: 'outage',
      priority: active ? 1 : 3,
      ts: end || start,
      url: optStr(a.url),
      popHead: `${str(names[0]) || cc0} internet`,
      popMeta: `Cloudflare Radar · ${cause ? cause.toLowerCase().replace(/_/g, ' ') : 'outage'}${
        active ? ' · ongoing' : ' · ended ' + relTime(end || start, now)
      }`,
      popText: esc(a.desc),
    });
  });

  // === Health: WHO outbreaks + CDC travel notices (2053-2072) ===
  const hw = asRec(D.healthWatch);
  const seenHealth = new Set<string>();
  recs(hw.outbreaks).forEach((o) => {
    const max = riskMax(o.risk);
    const maxLower = max.toLowerCase();
    const col = HEALTH_RISK_COL[maxLower] || 'rgba(127,224,192,0.7)';
    const riskObj = o.risk && typeof o.risk === 'object' ? asRec(o.risk) : {};
    const r = o.risk
      ? `WHO risk ${max}${riskObj.national ? ` · national ${riskObj.national}` : ''}${
          riskObj.regional ? ` · regional ${riskObj.regional}` : ''
        }${riskObj.global ? ` · global ${riskObj.global}` : ''}`
      : 'WHO has not published a risk level';
    const url = optStr(o.url);
    const last = optStr(o.last);
    const first = str(o.first);
    asArr(o.pins).forEach((pin) => {
      const p = asArr(pin);
      const plat = numOrNull(p[0]);
      const plon = numOrNull(p[1]);
      if (plat == null || plon == null) return;
      const place = str(p[2]);
      seenHealth.add(`${plat},${plon}`);
      points.push({
        lat: plat,
        lng: plon,
        size: 0.3,
        _r: maxLower === 'very high' ? 5.2 : maxLower === 'high' ? 4.6 : 3.8,
        color: col,
        _stroke: col.replace(/[\d.]+\)$/, '0.25)'),
        type: 'health',
        priority: 2,
        ts: last,
        url,
        popHead: `${str(o.disease)} · ${place}`,
        popMeta: `WHO outbreak · ${num(o.updates)} notice${num(o.updates) === 1 ? '' : 's'} since ${first.slice(
          0,
          10,
        )} · latest ${relTime(last, now)}`,
        popText: `${esc(r)}.${o.summary ? ' ' + esc(o.summary) : ''}`,
      });
    });
  });
  recs(hw.travel)
    .filter((n) => num(n.level) >= 2)
    .forEach((n) => {
      const url = optStr(n.url);
      const date = optStr(n.date);
      asArr(n.pins).forEach((pin) => {
        const p = asArr(pin);
        const plat = numOrNull(p[0]);
        const plon = numOrNull(p[1]);
        if (plat == null || plon == null) return;
        const place = str(p[2]);
        const k = `${plat},${plon}`;
        if (seenHealth.has(k)) return;
        seenHealth.add(k);
        const level = num(n.level);
        const col =
          level >= 4 ? 'rgba(255,107,116,0.75)' : level === 3 ? 'rgba(245,154,94,0.75)' : 'rgba(127,224,192,0.55)';
        points.push({
          lat: plat,
          lng: plon,
          size: 0.15,
          _r: level >= 3 ? 3.6 : 2.6,
          color: col,
          _stroke: col.replace(/[\d.]+\)$/, '0.2)'),
          type: 'health',
          priority: 3,
          ts: date,
          url,
          popHead: `${str(n.name)} · ${place}`,
          popMeta: `CDC travel notice · Level ${level} · ${CDC_LEVEL_LABEL[level] || ''}`,
          popText: num(n.n) > 1 ? `${num(n.n)} destinations under this notice.` : '',
        });
      });
    });

  // === News (2074-2078) ===
  recs(D.news).forEach((n) => {
    points.push({
      lat: num(n.lat),
      lng: num(n.lon),
      size: 0.2,
      _r: 3,
      color: 'rgba(143,184,216,0.75)',
      _stroke: 'rgba(143,184,216,0.25)',
      type: 'news',
      priority: 3,
      ts: optStr(n.date),
      url: optStr(n.url),
      popHead: str(n.source) + ' NEWS',
      popMeta: 'keyword: ' + str(n.region) + ' · ' + getAge(n.date, now),
      popText: cleanText(n.title),
    });
  });

  // === NOAA weather (2080-2084) ===
  recs(asRec(D.noaa).alerts).forEach((a) => {
    points.push({
      lat: num(a.lat),
      lng: num(a.lon),
      size: 0.22,
      _r: 4,
      color: 'rgba(245,154,94,0.8)',
      _stroke: 'rgba(245,154,94,0.3)',
      type: 'weather',
      priority: 2,
      popHead: str(a.event),
      popMeta: 'NOAA/NWS · ' + str(a.severity),
      popText: esc(a.headline || ''),
    });
  });

  // === EPA RadNet (2086-2091) ===
  recs(asRec(D.epa).stations).forEach((s) => {
    points.push({
      lat: num(s.lat),
      lng: num(s.lon),
      size: 0.18,
      _r: 3,
      color: 'rgba(242,200,121,0.7)',
      _stroke: 'rgba(242,200,121,0.25)',
      type: 'radiation',
      priority: 3,
      popHead: 'RadNet: ' + str(s.location),
      popMeta: 'EPA Radiation Monitor',
      popText: `${esc(s.analyte || '--')}: ${esc(s.result || '--')} ${esc(s.unit || '')}<br>State: ${esc(
        s.state,
      )}`,
    });
  });

  // === Space stations (2093-2102), SGP4 from the sweep's elements ===
  const satCache = new Map<string, satellite.SatRec | null>();
  recs(asRec(D.space).stations).forEach((st) => {
    const pos =
      satPosition(st, new Date(now), satCache) ??
      (numOrNull(st.lat) != null && numOrNull(st.lon) != null
        ? { lat: num(st.lat), lon: num(st.lon), alt: numOrNull(st.alt), vel: numOrNull(st.vel), live: false }
        : null);
    if (!pos) return;
    const liveLabel = pos.live ? 'live SGP4' : str(st.live) || 'position at sweep';
    const primary = bool(st.primary);
    const attached = bool(st.attached);
    const alt = numOrNull(pos.alt);
    const vel = numOrNull(pos.vel);
    const period = numOrNull(st.period);
    const inclination = numOrNull(st.inclination);
    const apogee = numOrNull(st.apogee);
    const perigee = numOrNull(st.perigee);
    const epoch = optStr(st.epoch);
    const pt: MapPoint = {
      lat: pos.lat,
      lng: pos.lon,
      size: primary ? 0.4 : 0.22,
      _r: primary ? 5 : 3,
      color: primary ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
      _stroke: 'rgba(255,255,255,0.4)',
      type: 'space',
      priority: primary ? 1 : 3,
      _sat: num(st.noradId),
      popHead: str(st.name),
      popMeta: `${primary ? 'Space station' : attached ? 'Attached module' : 'Spacecraft'} · ${liveLabel}`,
      popText: `Lat ${pos.lat.toFixed(2)}° · Lon ${pos.lon.toFixed(2)}°<br>Altitude ${
        alt != null ? alt + ' km' : '--'
      }${vel ? ` · ${vel.toLocaleString()} km/h` : ''}<br>${
        period ? `Period ${period.toFixed(1)} min · ` : ''
      }${inclination != null ? `Incl ${inclination.toFixed(1)}°` : ''}${
        apogee != null ? `<br>Apogee ${apogee} km · Perigee ${perigee} km` : ''
      }${epoch ? `<br><span style="opacity:.7">Elements ${relTime(epoch, now)} · NORAD ${str(st.noradId)}</span>` : ''}`,
    };
    points.push(pt);
    if (primary) {
      internalLabels.push({
        lat: pos.lat,
        lng: pos.lon,
        text: str(st.name).split('(')[0]!.trim(),
        type: 'space',
      });
    }
  });

  // === GDELT events (2104-2113) ===
  const gdelt = asRec(D.gdelt);
  recs(gdelt.geoPoints).forEach((g) => {
    const sev = gdeltSeverity(g.worst);
    const col = sev >= 5 ? '255,107,116' : sev >= 3 ? '245,154,94' : '106,168,255';
    const worst = str(g.worst);
    const type = str(g.type);
    const head = worst && worst !== type ? `${type} · incl. ${worst}` : type || 'GDELT event';
    const latest = optStr(g.latest);
    const when = latest ? ' · ' + relTime(latest, now) : '';
    const count = num(g.count);
    points.push({
      lat: num(g.lat),
      lng: num(g.lon),
      size: 0.15 + Math.min(count / 60, 0.25),
      _r: 2.5 + Math.min(count, 40) / 12,
      color: `rgba(${col},0.75)`,
      _stroke: `rgba(${col},0.25)`,
      type: 'gdelt',
      priority: sev >= 5 ? 2 : 3,
      ts: latest,
      url: optStr(g.url),
      popHead: head,
      popMeta: `GDELT · ${count} sources · ${num(g.events)} events${when}`,
      popText: `${esc(g.name) || 'Global event'}${g.actors ? '<br>' + esc(g.actors) : ''}<br><span style="opacity:.7">Goldstein ${
        g.goldstein ?? '--'
      } · tone ${g.tone ?? '--'}</span>`,
    });
  });

  // === Live tracks (Neptun) (2115-2124) ===
  const trackRows = input.tracks?.tracks;
  if (Array.isArray(trackRows)) {
    trackRows.forEach((t) => {
      const col =
        t.type === 'missile' || t.type === 'shahed'
          ? 'rgba(255,107,116,0.95)'
          : t.type === 'fpv'
            ? 'rgba(242,200,121,0.95)'
            : 'rgba(245,154,94,0.95)';
      points.push({
        lat: num(t.lat),
        lng: num(t.lon),
        size: 0.4,
        _r: 5,
        color: col,
        _stroke: 'rgba(0,0,0,0.4)',
        type: 'track',
        priority: 1,
        ts: optStr(t.updatedAt),
        popHead: (t.title || 'Track') + ' · ' + (t.locality || t.region || ''),
        popMeta: `${(t.type || 'track').toUpperCase()} · ${t.confidence || ''} · ${
          t.sourceCount || 1
        } source(s)`,
        popText: `${esc(t.explanation || '')}<br>Heading: ${
          t.heading != null ? t.heading + '°' : '—'
        }<br>Uncertainty: ±${t.uncertaintyKm || '?'} km`,
      });
    });
  }

  // === Earthquakes (2126-2133) ===
  if (Array.isArray(input.quakes)) {
    input.quakes.forEach((q) => {
      const mag = num(q.mag);
      const ts = optStr(q.ts);
      const depth = numOrNull(q.depth);
      points.push({
        lat: num(q.lat),
        lng: num(q.lon),
        size: 0.18 + Math.min(mag / 10, 0.5),
        _r: 2.5 + Math.min(mag, 7) * 0.8,
        color: magColor(mag),
        _stroke: 'rgba(0,0,0,0.35)',
        type: 'quake',
        priority: 1,
        ts,
        url: optStr(q.url),
        popHead: `M${mag.toFixed(1)} earthquake`,
        popMeta: 'USGS · ' + getAge(q.ts, now),
        popText: `${esc(q.place || '')}<br>Depth: ${
          depth != null ? Math.round(depth) + ' km' : '?'
        }${q.tsunami ? '<br><span style="color:#ff8a5c">Tsunami flag</span>' : ''}`,
      });
    });
  }

  // ─── Layer counts (2140-2142): available points by type, plus the conflict override ───────────
  const layerCounts: Record<string, number> = {};
  points.forEach((p) => {
    layerCounts[p.type] = (layerCounts[p.type] || 0) + 1;
  });
  layerCounts.conflict = severeGdelt(gdelt).length;

  // ─── Filter (2137-2138 via layerDefs.passesLayer): layer / region / time ──────────────────────
  const plottingPoints = points.filter((p) =>
    passesLayer(
      { type: p.type, lat: p.lat, lng: p.lng, ts: p.ts },
      {
        visible: input.layerVisible,
        region: input.region,
        timeWindow: input.timeWindow,
        now,
      },
    ),
  );

  // ─── seenMarkers diffing (2144-2152) ─────────────────────────────────────────────────────────
  const firstPlot = input.seenMarkers === null;
  const nextSeen = new Set<string>();
  plottingPoints.forEach((p) => {
    p._id = p.type + '|' + (p.popHead || '') + '|' + p.lat.toFixed(2) + ',' + p.lng.toFixed(2);
    p._new = !firstPlot && !!input.seenMarkers && !input.seenMarkers.has(p._id);
    nextSeen.add(p._id);
  });

  // ─── Labels (2154-2160) ──────────────────────────────────────────────────────────────────────
  const outputLabels: PlotLabel[] = internalLabels
    .filter((l) => bool(input.layerVisible[l.type]) && inActiveRegion(l.lat, l.lng, input.region))
    .map((l) => ({ text: l.text, lng: l.lng, lat: l.lat }));
  if (input.region === 'world' && input.showAggregates) {
    (Object.keys(REGION_CENTROID) as RegionKey[]).forEach((r) => {
      const centroid = REGION_CENTROID[r];
      if (!centroid) return;
      const n = points.filter((p) => inRegionBox(p.lat, p.lng, r)).length;
      if (n > 0) {
        outputLabels.push({
          lat: centroid[0],
          lng: centroid[1],
          text: `${REGION_LABEL[r]} · ${n}`,
          aggregate: true,
          region: r,
        });
      }
    });
  }

  // ─── Conflict rings (2162-2170) ──────────────────────────────────────────────────────────────
  const ringFeatures: GeoJSON.Feature[] = [];
  if (input.layerVisible.conflict) {
    severeGdelt(gdelt)
      .filter((g) => inActiveRegion(num(g.lat), num(g.lon), input.region))
      .forEach((g) => {
        const maxR = Math.max(2, Math.min(6, 1 + Math.log2(Math.max(num(g.count), 1))));
        const latest = optStr(g.latest);
        ringFeatures.push({
          type: 'Feature',
          properties: {
            r: Math.max(3, Math.min(14, maxR * 2)),
            head: str(g.worst),
            text: `${esc(g.name)}${g.actors ? '<br>' + esc(g.actors) : ''}`,
            meta: `GDELT · ${num(g.count)} sources${latest ? ' · ' + relTime(latest, now) : ''}`,
          },
          geometry: { type: 'Point', coordinates: [num(g.lon), num(g.lat)] },
        });
      });
  }

  // ─── Trails (2174-2181). The legacy maps trail points to `[lat,lng]` (jarvis.html 2178/1851);
  // that ordering is preserved verbatim. ─────────────────────────────────────────────────────────
  const trailFeatures: GeoJSON.Feature[] = [];
  if (input.layerVisible.track && Array.isArray(trackRows)) {
    trackRows.forEach((t) => {
      const trail = (t.trail || []).map((p) => [p.lat, p.lng]);
      if (trail.length > 1) {
        trailFeatures.push({
          type: 'Feature',
          properties: { color: 'rgba(255,158,107,0.7)' },
          geometry: { type: 'LineString', coordinates: trail.map((c) => c as [number, number]) },
        });
      }
    });
  }

  return {
    points: { type: 'FeatureCollection', features: plottingPoints.map(ptFeat) },
    rings: ringFeatures.length ? { type: 'FeatureCollection', features: ringFeatures } : emptyFC(),
    trails: trailFeatures.length ? { type: 'FeatureCollection', features: trailFeatures } : emptyFC(),
    labels: outputLabels,
    layerCounts,
    nextSeen,
    mapPoints: plottingPoints,
  };
}

// Internal label rows carry the `type` needed by the layer filter; only `text/lng/lat/region/aggregate`
// survive into `PlotResult.labels`. Declared inside `plotData` so the function has no shared state.
interface InternalLabel {
  lat: number;
  lng: number;
  text: string;
  type: string;
}

/** Severe GDELT clusters (1473): geo-tagged events at Assault or above. */
function severeGdelt(gdelt: LooseRecord): LooseRecord[] {
  return asArr(gdelt.geoPoints).filter((g) => {
    const r = asRec(g);
    return !!r.lat && !!r.lon && gdeltSeverity(r.worst) >= 4;
  }) as LooseRecord[];
}
