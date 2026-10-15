import type { Shape } from '../../../state/url';
import type { DrawFeature } from './types';

export function featureToShape(feature: DrawFeature): Shape {
  if (feature._circle) {
    return { kind: 'circle', center: feature._circle.center, radiusKm: feature._circle.radiusKm };
  }
  const ring = (feature.geometry.coordinates[0] ?? []) as number[][];
  const props = feature.properties as Record<string, unknown> | null;
  if (props && props.shape === 'rect') {
    const xs = ring.map((p) => p[0] ?? 0);
    const ys = ring.map((p) => p[1] ?? 0);
    return {
      kind: 'rect',
      sw: { lat: Math.min(...ys), lng: Math.min(...xs) },
      ne: { lat: Math.max(...ys), lng: Math.max(...xs) },
    };
  }
  const pts = ring.length > 1 ? ring.slice(0, -1) : ring;
  return { kind: 'poly', ring: pts.map((p) => ({ lng: p[0] ?? 0, lat: p[1] ?? 0 })) };
}
