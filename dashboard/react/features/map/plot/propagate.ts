import * as satellite from 'satellite.js';
import type { LooseRecord, SatPos } from './types';
import { str } from './utils';

export type SatrecCache = Map<string, satellite.SatRec | null>;

function satrecFor(st: LooseRecord, cache: SatrecCache): satellite.SatRec | null {
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

interface EciVector {
  x: number;
  y: number;
  z: number;
}

function speedKmh(velocity: unknown): number | null {
  if (!velocity || typeof velocity !== 'object') return null;
  const v = velocity as EciVector;
  return Math.hypot(v.x, v.y, v.z) * 3600;
}

export function satPosition(st: LooseRecord, when: Date, cache: SatrecCache): SatPos | null {
  const rec = satrecFor(st, cache);
  if (!rec) return null;
  try {
    const pv = satellite.propagate(rec, when) as unknown as { position?: unknown; velocity?: unknown } | null;
    const position = pv?.position;
    if (!position || typeof position !== 'object') return null;
    const vel = speedKmh(pv?.velocity);
    const geo = satellite.eciToGeodetic(position as EciVector, satellite.gstime(when));
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
