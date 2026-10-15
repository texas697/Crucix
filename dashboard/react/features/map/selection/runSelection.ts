import type { MapPoint } from '../plot';
import { haversineKm, pointInRing } from './geometry';
import type { DrawFeature } from './types';

export function insideShape(shape: DrawFeature, lat: number, lng: number): boolean {
  if (shape._circle) return haversineKm(shape._circle.center, { lat, lng }) <= shape._circle.radiusKm;
  const ring = shape.geometry.coordinates[0];
  return ring ? pointInRing(ring as unknown as number[][], lng, lat) : false;
}

export function runSelection(shape: DrawFeature, mapPoints: MapPoint[]): MapPoint[] {
  return mapPoints.filter((p) => insideShape(shape, p.lat, p.lng));
}
