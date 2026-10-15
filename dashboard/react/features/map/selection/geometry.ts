import { CIRCLE_SEGMENTS, EARTH_RADIUS_KM } from './consts';
import type { LngLat } from './types';

const toRad = (d: number): number => (d * Math.PI) / 180;

export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function geoCircle(lng: number, lat: number, radiusKm: number, n: number = CIRCLE_SEGMENTS): [number, number][] {
  const d = radiusKm / EARTH_RADIUS_KM;
  const p1 = toRad(lat);
  const l1 = toRad(lng);
  const dest = (brg: number): [number, number] => {
    const t = toRad(brg);
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
    const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [(l2 * 180) / Math.PI, (p2 * 180) / Math.PI];
  };
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(dest((i / n) * 360));
  return pts;
}

export function pointInRing(ring: number[][], lng: number, lat: number): boolean {
  let isInside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ri = ring[i];
    const rj = ring[j];
    if (!ri || !rj) continue;
    const xi = ri[0];
    const yi = ri[1];
    const xj = rj[0];
    const yj = rj[1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) isInside = !isInside;
  }
  return isInside;
}
