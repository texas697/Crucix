import type { SweepData } from '../../api/types';
import { asArr } from './coerce';

export function barMarkerCount(data: SweepData | null): number {
  if (!data) return 0;
  const fires = asArr(data.thermal).reduce((sum, theater) => sum + asArr(theater.fires).length, 0);
  return asArr(data.air).length + fires;
}
