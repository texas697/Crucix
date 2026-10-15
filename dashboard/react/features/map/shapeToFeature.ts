import { circleFeature, polyFeature, rectFeature, type DrawFeature } from './selection';
import type { Shape } from '../../state/url';

export function shapeToFeature(shape: Shape): DrawFeature {
  if (shape.kind === 'circle') return circleFeature({ lng: shape.center.lng, lat: shape.center.lat }, shape.radiusKm);
  if (shape.kind === 'rect') {
    return rectFeature({ lng: shape.sw.lng, lat: shape.sw.lat }, { lng: shape.ne.lng, lat: shape.ne.lat });
  }
  return polyFeature(shape.ring.map((p) => [p.lng, p.lat] as [number, number]));
}
