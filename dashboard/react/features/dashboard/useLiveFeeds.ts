// Live-feed polling for the dashboard panels. One hook instance owns every cadence the legacy page
// started from init() (jarvis.html 3021-3025): tracks 15s, alerts 45s, quakes 60s, markets 60s (the
// legacy AIS/SHIPS cadence has its own transport and is not part of this hook).
//
// Ported from the legacy ad-hoc module-level caches:
//   - ensureTracks  (2573-2581) -> GET /api/tracks, keep `d.tracks`
//   - ensureAlerts  (2534-2543) -> GET /api/alerts, then the render-time recent-within-3600s slice(10)
//   - ensureQuakes  (2629-2644) -> USGS 2.5_day.geojson -> sorted quake rows
//   - ensurePolymarket (2501-2520) -> Polymarket gamma events -> keyword-filtered market rows
//
// Two behaviours matter for the React lifecycle:
//   1. Prerendering: speculation-rules prerendering runs page scripts while the page is invisible.
//      We do nothing while `document.prerendering === true` and start on `prerenderingchange` (the
//      same guard transport.ts uses).
//   2. StrictMode/remount: every interval and listener is torn down on cleanup, and each setState is
//      gated by a per-run `alive` flag, so a double-mount never leaves a duplicate timer and a late
//      response never writes into an unmounted tree.
//
// The hook never throws: a failed fetch (or a `{error}` body) leaves that feed's current value
// untouched, matching the legacy `catch { ... || ... }` behaviour.

import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../../api/client';
import type { QuakeItem } from './panels/RowB';
import type { AlertItem, MarketItem, TrackItem } from './panels/RowD';

/** Same-origin feed endpoints (server.mjs 630-673). */
const TRACKS_PATH = '/api/tracks';
const ALERTS_PATH = '/api/alerts';

/** External feeds; the `fetchImpl` seam keeps tests off the network. */
const QUAKES_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
const POLYMARKET_URL =
  'https://gamma-api.polymarket.com/events?limit=50&active=true&closed=false&order=volume24hr&ascending=false';

/** Legacy conflict keyword gate (jarvis.html 2507). */
const MARKET_KEYWORDS =
  /(iran|israel|russia|ukrain|war|ceasefire|strike|nuclear|nato|china|taiwan|gaza|hezbollah|houthi|\boil\b|gold|recession|invasion|missile)/i;

/** Recent-window and cap for the alerts reshape (jarvis.html 2528). */
const ALERT_WINDOW_MS = 3_600_000;
const ALERT_LIMIT = 10;

type Rec = Record<string, unknown>;

interface DocumentWithPrerender extends Document {
  prerendering?: boolean;
}

function isRec(x: unknown): x is Rec {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function asRec(x: unknown): Rec {
  return isRec(x) ? x : {};
}

function asArr(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function num(x: unknown, d = 0): number {
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : d;
}

/** Resolve an alert timestamp to epoch seconds, tolerating unix-seconds or ISO strings. */
function alertSeconds(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    const ms = Date.parse(s);
    return Number.isFinite(ms) ? ms / 1000 : null;
  }
  return null;
}

/** `/api/tracks` -> the `tracks` array the panel takes (legacy kept the whole envelope). */
export function reshapeTracks(payload: unknown): TrackItem[] {
  return asArr(asRec(payload).tracks) as TrackItem[];
}

/**
 * `/api/alerts` -> the recent-within-3600s slice(10) the legacy computed at render time (2528).
 * `time` is normalised to a string so the panel's `alertMs` parser can consume it.
 */
export function reshapeAlerts(payload: unknown, nowMs: number): AlertItem[] {
  const items = asArr(asRec(payload).items);
  const recent: AlertItem[] = [];
  for (const raw of items) {
    const a = asRec(raw);
    const secs = alertSeconds(a.time);
    if (secs == null || nowMs / 1000 - secs >= ALERT_WINDOW_MS / 1000) continue;
    recent.push({ ...(a as AlertItem), time: typeof a.time === 'string' ? a.time : String(a.time) });
    if (recent.length >= ALERT_LIMIT) break;
  }
  return recent;
}

/** USGS GeoJSON -> sorted quake rows (jarvis.html 2635-2639). */
export function reshapeQuakes(payload: unknown): QuakeItem[] {
  const items: QuakeItem[] = [];
  for (const raw of asArr(asRec(payload).features)) {
    const f = asRec(raw);
    const props = asRec(f.properties);
    const coords = asArr(asRec(f.geometry).coordinates);
    const lat = typeof coords[1] === 'number' ? coords[1] : null;
    const lon = typeof coords[0] === 'number' ? coords[0] : null;
    if (lat == null || lon == null) continue;
    let ts: string | null = null;
    if (typeof props.time === 'number' || typeof props.time === 'string') {
      const d = new Date(props.time);
      ts = Number.isFinite(d.getTime()) ? d.toISOString() : null;
    }
    items.push({
      id: typeof f.id === 'string' ? f.id : undefined,
      mag: num(props.mag, 0),
      place: typeof props.place === 'string' ? props.place : '',
      lat,
      lon,
      depth: typeof coords[2] === 'number' ? coords[2] : null,
      ts,
      url: typeof props.url === 'string' ? props.url : null,
      tsunami:
        typeof props.tsunami === 'number' || typeof props.tsunami === 'boolean' ? props.tsunami : null,
    });
  }
  items.sort((a, b) => num(b.mag) - num(a.mag));
  return items;
}

/** Polymarket gamma events -> keyword-filtered rows, max 6 (jarvis.html 2508-2517). */
export function reshapeMarkets(payload: unknown): MarketItem[] {
  const items: MarketItem[] = [];
  for (const raw of asArr(payload)) {
    const ev = asRec(raw);
    const title = typeof ev.title === 'string' ? ev.title : '';
    if (!MARKET_KEYWORDS.test(title)) continue;
    const markets = asArr(ev.markets);
    if (!markets.length) continue;
    const m = asRec(markets[0]);
    let prices: unknown[] = [];
    try {
      const parsed: unknown = JSON.parse(typeof m.outcomePrices === 'string' ? m.outcomePrices : '[]');
      prices = Array.isArray(parsed) ? parsed : [];
    } catch {
      prices = [];
    }
    const first = prices[0];
    const yes = first != null ? Number(first) : null;
    if (yes == null || Number.isNaN(yes)) continue;
    const vol = Number(m.volume24hr || ev.volume24hr || 0);
    items.push({
      title,
      yes,
      vol: Number.isFinite(vol) ? vol : 0,
      slug: typeof ev.slug === 'string' ? ev.slug : undefined,
    });
    if (items.length >= 6) break;
  }
  return items;
}

/** Injection seams mirroring the transport's test seams. */
export interface LiveFeedsOptions {
  /** When false the hook is a no-op (default true). */
  enabled?: boolean;
  /** Poll cadences in ms; each defaults to the legacy interval. */
  intervals?: { tracks?: number; alerts?: number; quakes?: number; markets?: number };
  /** Seam for the two external feeds (USGS, Polymarket); defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Clock seam for the alerts recent-window; defaults to `Date.now`. */
  now?: () => number;
}

/** Plain data handed to the panels; each is `null` until its first successful load. */
export interface LiveFeeds {
  tracks: TrackItem[] | null;
  alerts: AlertItem[] | null;
  quakes: QuakeItem[] | null;
  markets: MarketItem[] | null;
}

/**
 * Polls the dashboard's live feeds with the legacy cadences and returns reshaped arrays for the
 * panels. Lifecycle-managed: one immediate fetch per feed, then one interval each; prerendering-aware
 * and StrictMode-safe.
 */
export function useLiveFeeds(api: ApiClient, options: LiveFeedsOptions = {}): LiveFeeds {
  const { enabled = true, intervals, fetchImpl = fetch, now = Date.now } = options;
  const tracksMs = intervals?.tracks ?? 15000;
  const alertsMs = intervals?.alerts ?? 45000;
  const quakesMs = intervals?.quakes ?? 60000;
  const marketsMs = intervals?.markets ?? 60000;

  const [tracks, setTracks] = useState<TrackItem[] | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [quakes, setQuakes] = useState<QuakeItem[] | null>(null);
  const [markets, setMarkets] = useState<MarketItem[] | null>(null);

  // Hold the injectable seams in refs: callers routinely pass inline arrows (e.g. `now: () => 0`),
  // and treating their identity as a dependency would restart the effect on every render and loop.
  const nowRef = useRef(now);
  nowRef.current = now;
  const fetchRef = useRef(fetchImpl);
  fetchRef.current = fetchImpl;

  useEffect(() => {
    if (!enabled) return;

    let alive = true;
    const ids: ReturnType<typeof setInterval>[] = [];

    async function loadTracks(): Promise<void> {
      try {
        const d = await api.get<unknown>(TRACKS_PATH);
        if (!alive || (isRec(d) && d.error)) return;
        setTracks(reshapeTracks(d));
      } catch {
        /* leave the last value in place */
      }
    }

    async function loadAlerts(): Promise<void> {
      try {
        const d = await api.get<unknown>(ALERTS_PATH);
        if (!alive || (isRec(d) && d.error)) return;
        setAlerts(reshapeAlerts(d, nowRef.current()));
      } catch {
        /* leave the last value in place */
      }
    }

    async function loadQuakes(): Promise<void> {
      try {
        const res = await fetchRef.current(QUAKES_URL);
        const d: unknown = await res.json();
        if (!alive) return;
        setQuakes(reshapeQuakes(d));
      } catch {
        /* leave the last value in place */
      }
    }

    async function loadMarkets(): Promise<void> {
      try {
        const res = await fetchRef.current(POLYMARKET_URL);
        const d: unknown = await res.json();
        if (!alive) return;
        setMarkets(reshapeMarkets(d));
      } catch {
        /* leave the last value in place */
      }
    }

    function start(): void {
      if (!alive) return;
      void loadTracks();
      void loadAlerts();
      void loadQuakes();
      void loadMarkets();
      ids.push(setInterval(() => void loadTracks(), tracksMs));
      ids.push(setInterval(() => void loadAlerts(), alertsMs));
      ids.push(setInterval(() => void loadQuakes(), quakesMs));
      ids.push(setInterval(() => void loadMarkets(), marketsMs));
    }

    const doc = typeof document !== 'undefined' ? (document as DocumentWithPrerender) : undefined;
    let removePrerender: (() => void) | undefined;
    if (doc && doc.prerendering === true) {
      const onChange = (): void => {
        if (doc.prerendering === false) {
          removePrerender?.();
          removePrerender = undefined;
          start();
        }
      };
      doc.addEventListener('prerenderingchange', onChange);
      removePrerender = () => doc.removeEventListener('prerenderingchange', onChange);
    } else {
      start();
    }

    return () => {
      alive = false;
      removePrerender?.();
      for (const id of ids) clearInterval(id);
      ids.length = 0;
    };
  }, [api, enabled, tracksMs, alertsMs, quakesMs, marketsMs]);

  return { tracks, alerts, quakes, markets };
}
