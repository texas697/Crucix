import type { MapPoint } from './types';

export function markNewMarkers(points: MapPoint[], seenMarkers: Set<string> | null): Set<string> {
  const isFirstPlot = seenMarkers === null;
  const nextSeen = new Set<string>();
  points.forEach((p) => {
    p._id = p.type + '|' + (p.popHead || '') + '|' + p.lat.toFixed(2) + ',' + p.lng.toFixed(2);
    p._new = !isFirstPlot && !!seenMarkers && !seenMarkers.has(p._id);
    nextSeen.add(p._id);
  });
  return nextSeen;
}
