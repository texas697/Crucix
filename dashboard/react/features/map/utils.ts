import type { MapGeoJSONFeature } from 'maplibre-gl';
import { NEAREST_POINT_DEG } from './consts';
import type { MapFeatureCollection, PopupFeature } from './types';

export function nearestPointFeature(fc: MapFeatureCollection | undefined, lng: number, lat: number): [number, number] | undefined {
  if (!fc) return undefined;
  let best: [number, number] | undefined;
  let bestDistance = NEAREST_POINT_DEG;
  for (const feature of fc.features) {
    const geometry = feature.geometry;
    if (!geometry || geometry.type !== 'Point') continue;
    const [x, y] = geometry.coordinates;
    if (x === undefined || y === undefined) continue;
    const distance = Math.hypot(y - lat, x - lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = [x, y];
    }
  }
  return best;
}

const asText = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export function toPopupFeature(hit: MapGeoJSONFeature): PopupFeature {
  const p = (hit.properties || {}) as Record<string, unknown>;
  return { head: asText(p.head), text: asText(p.text), meta: asText(p.meta), url: asText(p.url), isNew: p.isNew === '1' };
}

export function swallowMapError(): void {
  return undefined;
}
