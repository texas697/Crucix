import { LAYER_DEFS, SELECTION_GROUP_LABELS } from './layerDefs';
import type { MapPoint } from './plot';

export const MAX_SELECTION_ROWS = 40;
const DEFAULT_GROUP_COLOR = '#dce2ec';

export interface SelectionGroupData {
  type: string;
  label: string;
  color: string;
  entries: Array<[number, MapPoint]>;
}

export function groupSelection(items: MapPoint[]): SelectionGroupData[] {
  const byType = new Map<string, Array<[number, MapPoint]>>();
  items.forEach((point, index) => {
    const entries = byType.get(point.type) ?? [];
    entries.push([index, point]);
    byType.set(point.type, entries);
  });
  return [...byType.entries()]
    .map(([type, entries]) => {
      const def = LAYER_DEFS.find((layer) => layer.key === type);
      return { type, label: SELECTION_GROUP_LABELS[type] ?? def?.label ?? type, color: def?.color ?? DEFAULT_GROUP_COLOR, entries };
    })
    .sort((a, b) => b.entries.length - a.entries.length);
}
