import { passesLayer } from '../layerDefs';
import type { MapPoint, PlotInput } from './types';

export function visiblePoints(points: MapPoint[], input: PlotInput, now: number): MapPoint[] {
  const options = { visible: input.layerVisible, region: input.region, timeWindow: input.timeWindow, now };
  return points.filter((p) => passesLayer({ type: p.type, lat: p.lat, lng: p.lng, ts: p.ts }, options));
}
