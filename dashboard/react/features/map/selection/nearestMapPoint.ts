import type { MapPoint } from '../plot';
import { NEAREST_POINT_DEGREES } from './consts';

export function nearestMapPoint(lat: number, lng: number, points: MapPoint[]): MapPoint | null {
  let best: MapPoint | null = null;
  let bestDistance = NEAREST_POINT_DEGREES;
  for (const p of points) {
    const d = Math.hypot(p.lat - lat, p.lng - lng);
    if (d < bestDistance) {
      bestDistance = d;
      best = p;
    }
  }
  return best;
}
