import * as satellite from 'satellite.js';
import type { SatPosition, SpaceStation } from './types';

const satrecCache = new Map<string, satellite.SatRec | null>();

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

export function satPosition(st: SpaceStation | null | undefined, when?: Date): SatPosition | null {
  const rec = satrecFor(st);
  if (!rec) return null;
  const t = when || new Date();
  try {
    const pv = satellite.propagate(rec, t) as unknown as { position?: unknown; velocity?: unknown } | null;
    const position = pv?.position;
    if (!position || typeof position !== 'object') return null;
    const vel = speedKmh(pv?.velocity);
    const geo = satellite.eciToGeodetic(position as EciVector, satellite.gstime(t));
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
