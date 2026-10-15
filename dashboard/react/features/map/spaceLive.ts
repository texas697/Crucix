// Live satellite propagation, ported faithfully from `dashboard/public/jarvis.html`:
//   - `satrecCache` / `satrecFor` (1873-1881)
//   - `satPosition` (1882-1891)
//   - `groundTrack` (1898-1907)
//   - the `spaceTick` interval body / `startSpaceLive` (1909-1929)
//   - the `BASEMAPS` cycle from `cycleBasemap` (1463-1470)
//
// Deliberately free of any `maplibre-gl` import: this module only propagates orbits and owns the
// live-loop timer. The map surface is fed the results by the caller. `plot.ts` carries a private
// copy of satrecFor/satPosition for the synchronous initial plot; this module is the live layer.
//
// The basemap toggle helpers (`nextBasemap` / `basemapLabel`) live here because this is the
// map-flavoured module this change owns — the orchestrator calls `nextBasemap` and passes the
// resulting key to MapView (mapping the key to a style via `mapLayers.BASEMAPS[0|1|2]`).

import * as satellite from 'satellite.js';

/** A `space.stations[]` row from the sweep. Fields are loose, exactly like the legacy `st`. */
export type SpaceStation = Record<string, unknown>;

/** The propagated position shape returned by `satPosition` (legacy object literal). */
export interface SatPosition {
  lat: number;
  lon: number;
  alt: number | null;
  vel: number | null;
  live: true;
}

/** One station paired with its freshly propagated position, handed to `onTick`. */
export interface SpaceLiveTick {
  station: SpaceStation;
  pos: SatPosition;
}

/**
 * Module-level SGP4 record cache, mirroring the legacy `satrecCache` object. Keyed by
 * `noradId|epoch` so a new element set for the same object is rebuilt.
 */
const satrecCache = new Map<string, satellite.SatRec | null>();

/**
 * Build (and cache) the SGP4 record for a station: prefer the OMM element set, else the two-line
 * element set. Legacy `satrecFor` (1874-1881). Returns null when the station carries no usable
 * elements or the parser throws.
 */
export function satrecFor(st: SpaceStation | null | undefined): satellite.SatRec | null {
  if (!st) return null;
  const key = `${String(st.noradId)}|${st.epoch ? String(st.epoch) : ''}`;
  const hit = satrecCache.get(key);
  if (hit !== undefined) return hit;
  let rec: satellite.SatRec | null = null;
  try {
    if (st.omm) {
      rec = satellite.json2satrec(st.omm as never);
    } else if (Array.isArray(st.tle) && st.tle.length >= 2) {
      rec = satellite.twoline2satrec(String(st.tle[0]), String(st.tle[1]));
    }
  } catch {
    rec = null;
  }
  satrecCache.set(key, rec);
  return rec;
}

/**
 * Propagate a station to `when` (default now) and convert to geodetic coordinates. Legacy
 * `satPosition` (1882-1891): lat/lon to two decimals, altitude rounded to km, speed rounded to
 * km/h. Returns null on a missing record or a propagation error.
 */
export function satPosition(st: SpaceStation | null | undefined, when?: Date): SatPosition | null {
  const rec = satrecFor(st);
  if (!rec) return null;
  const t = when || new Date();
  try {
    const pv = satellite.propagate(rec, t) as unknown as {
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
      satellite.gstime(t),
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

/**
 * Sample a station's orbit from `minutesBack` before to `minutesFwd` after `when` (default now),
 * one sample per `stepSec`, splitting into segments at the ±180° antimeridian. Legacy `groundTrack`
 * (1898-1907); the live layer calls it with ±46 minutes at a 60 s step. Returns arrays of
 * `[lon, lat]` coordinate pairs, one array per continuous segment.
 */
export function groundTrack(
  st: SpaceStation,
  when: Date = new Date(),
  minutesBack = 46,
  minutesFwd = 46,
  stepSec = 60,
): [number, number][][] {
  const now = when.getTime();
  const segs: [number, number][][] = [];
  let seg: [number, number][] = [];
  let prev: SatPosition | null = null;
  for (let dt = -minutesBack * 60; dt <= minutesFwd * 60; dt += stepSec) {
    const p = satPosition(st, new Date(now + dt * 1000));
    if (!p) continue;
    if (prev && Math.abs(p.lon - prev.lon) > 180) {
      if (seg.length > 1) segs.push(seg);
      seg = [];
    }
    seg.push([p.lon, p.lat]);
    prev = p;
  }
  if (seg.length > 1) segs.push(seg);
  return segs;
}

export interface SpaceLiveOptions {
  /** Returns the stations to track; re-read on every tick (legacy `D.space.stations`). */
  getStations: () => SpaceStation[];
  /** Receives the stations that produced a finite position this tick. */
  onTick: (positions: SpaceLiveTick[]) => void;
  /** Tick period in milliseconds; legacy `setInterval(spaceTick, 5000)`. */
  intervalMs?: number;
}

export interface SpaceLive {
  /** Arm the interval and tick once immediately. Idempotent: re-arms rather than duplicating. */
  start(): void;
  /** Clear the interval. Safe to call when stopped; a later start() re-arms cleanly. */
  stop(): void;
}

/**
 * The live satellite loop, ported from `startSpaceLive` (1929) + the `spaceTick` body (1909-1928).
 * `start()` clears any existing timer before arming a new one and fires one immediate tick (the
 * legacy called `spaceTick()` once up front), so restarting after `stop()` cannot leave a stale
 * interval behind.
 */
export function createSpaceLive({ getStations, onTick, intervalMs = 5000 }: SpaceLiveOptions): SpaceLive {
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    const results: SpaceLiveTick[] = [];
    for (const st of getStations() || []) {
      const pos = satPosition(st);
      if (pos) results.push({ station: st, pos });
    }
    onTick(results);
  };

  return {
    start() {
      if (timer) clearInterval(timer);
      timer = setInterval(tick, intervalMs);
      tick();
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

// ─── Basemap toggle (legacy `BASEMAPS` / `cycleBasemap`, jarvis.html 1076-1080, 1463-1470) ────────

/** The three Carto basemaps, in legacy cycle order. */
export type BasemapKey = 'dark' | 'muted' | 'light';

/** Cycle order, matching the legacy `BASEMAPS` array indices 0/1/2. */
export const BASEMAP_ORDER: readonly BasemapKey[] = ['dark', 'muted', 'light'];

/** Display names, matching `BASEMAPS[i].name`. */
export const BASEMAP_LABELS: Record<BasemapKey, string> = {
  dark: 'Dark',
  muted: 'Muted',
  light: 'Light',
};

/** Legacy `currentBase=(currentBase+1)%BASEMAPS.length`: dark -> muted -> light -> dark. */
export function nextBasemap(current: BasemapKey): BasemapKey {
  const i = BASEMAP_ORDER.indexOf(current);
  return BASEMAP_ORDER[(i + 1) % BASEMAP_ORDER.length]!;
}

/** The button label for a basemap key (legacy `btn.textContent=s.name`). */
export function basemapLabel(key: BasemapKey): string {
  return BASEMAP_LABELS[key];
}
