import type { LooseRecord, MapPoint } from './types';
import { severeGdelt } from './utils';

export function countLayers(points: MapPoint[], gdelt: LooseRecord): Record<string, number> {
  const counts: Record<string, number> = {};
  points.forEach((p) => {
    counts[p.type] = (counts[p.type] || 0) + 1;
  });
  counts.conflict = severeGdelt(gdelt).length;
  return counts;
}
