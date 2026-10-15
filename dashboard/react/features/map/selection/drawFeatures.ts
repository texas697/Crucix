import { CIRCLE_SEGMENTS, MIN_CIRCLE_KM } from './consts';
import { geoCircle } from './geometry';
import type { DrawFeature, DrawState, LngLat } from './types';

export function emptyDrawState(): DrawState {
  return { tool: null, isDrawing: false, start: null, poly: [], feature: null };
}

function closeRing(ring: [number, number][], minLength: number): void {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length > minLength && first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([first[0], first[1]]);
  }
}

export function circleFeature(center: LngLat, radiusKm: number): DrawFeature {
  const ring = geoCircle(center.lng, center.lat, Math.max(radiusKm, MIN_CIRCLE_KM), CIRCLE_SEGMENTS);
  closeRing(ring, 1);
  return {
    type: 'Feature',
    properties: { kind: 'fill', shape: 'circle' },
    geometry: { type: 'Polygon', coordinates: [ring] },
    _circle: { center, radiusKm },
  };
}

export function rectFeature(a: LngLat, b: LngLat): DrawFeature {
  const w = Math.min(a.lng, b.lng);
  const e = Math.max(a.lng, b.lng);
  const s = Math.min(a.lat, b.lat);
  const n = Math.max(a.lat, b.lat);
  return {
    type: 'Feature',
    properties: { kind: 'fill', shape: 'rect' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
    },
  };
}

export function polyFeature(pts: [number, number][]): DrawFeature {
  const ring = pts.map((p) => [p[0], p[1]] as [number, number]);
  closeRing(ring, 2);
  return {
    type: 'Feature',
    properties: { kind: 'fill', shape: 'polygon' },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}
