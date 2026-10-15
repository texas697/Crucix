import { GROUND_TRACK_MINUTES, GROUND_TRACK_STEP_SEC } from './consts';
import { satPosition } from './propagate';
import type { SatPosition, SpaceStation } from './types';

export function groundTrack(
  st: SpaceStation,
  when: Date = new Date(),
  minutesBack = GROUND_TRACK_MINUTES,
  minutesFwd = GROUND_TRACK_MINUTES,
  stepSec = GROUND_TRACK_STEP_SEC,
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
