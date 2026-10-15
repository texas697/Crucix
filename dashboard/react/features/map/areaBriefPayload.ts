import type { Shape } from '../../state/url';
import type { AreaBriefMarkers } from './areaBriefTypes';
import { LAYER_DEFS } from './layerDefs';
import type { MapPoint } from './plot';

const round4 = (value: number): number => +value.toFixed(4);
const MAX_SAMPLES = 14;

export function shapePayload(shape: Shape): unknown {
  if (shape.kind === 'circle') {
    return { kind: 'circle', center: { lat: shape.center.lat, lng: shape.center.lng }, radiusKm: shape.radiusKm };
  }
  if (shape.kind === 'rect') {
    return {
      kind: 'polygon',
      ring: [
        [round4(shape.sw.lng), round4(shape.sw.lat)],
        [round4(shape.ne.lng), round4(shape.sw.lat)],
        [round4(shape.ne.lng), round4(shape.ne.lat)],
        [round4(shape.sw.lng), round4(shape.ne.lat)],
      ],
    };
  }
  return { kind: 'polygon', ring: shape.ring.map((p) => [round4(p.lng), round4(p.lat)]) };
}

const stripTags = (value: unknown): string => String(value ?? '').replace(/<[^>]+>/g, '');

export function markersPayload(items: MapPoint[]): AreaBriefMarkers {
  const counts: Record<string, number> = {};
  items.forEach((point) => {
    counts[point.type] = (counts[point.type] || 0) + 1;
  });
  const labelFor = (type: string): string => LAYER_DEFS.find((layer) => layer.key === type)?.label || type;
  const samples = [...items]
    .sort((a, b) => (a.priority || 9) - (b.priority || 9))
    .slice(0, MAX_SAMPLES)
    .map((point) => {
      const meta = point.popMeta ? ` — ${stripTags(point.popMeta)}` : '';
      return `${labelFor(point.type)}: ${stripTags(point.popHead)}${meta}`;
    });
  return { counts, samples };
}
