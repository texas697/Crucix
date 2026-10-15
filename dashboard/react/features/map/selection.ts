// Pure geometry + selection helpers for the spatial draw/select tools, ported faithfully from
// `jarvis.html`: `haversineKm` (1498-1503), `geoCircle` (1504-1515), `circleFeature` (1516-1520),
// `rectFeature` (1521-1524), `polyFeature` (1525-1529), `pointInRing` (1530-1537), `insideShape`
// (1538-1541), `reselect`/`runSelection` (1566-1577) and `nearestMapPoint` (2951-2955).
//
// The legacy functions read the mutable globals `drawTool`/`drawing`/`drawStart`/`drawPoly`/`drawGeo`
// and `currentMapPoints`; here every input is an explicit argument so the math is pure. `featureToShape`
// converts a drawn GeoJSON feature into the app-wide `Shape` the URL codec (`state/url.ts`) already uses.

import type * as GeoJSON from 'geojson';
import type { MapPoint } from './plot';
import type { Shape } from '../../state/url';

/** A plain lng/lat pair (matches the `state/url.ts` convention). */
export interface LngLat {
  lng: number;
  lat: number;
}

/** The three draw tools, keyed the same way the map controls are (`poly` is legacy `polygon`). */
export type DrawTool = 'circle' | 'rect' | 'poly';

/** Ring segment count used by `circleFeature` (legacy literal `geoCircle(..., 96)`). */
export const CIRCLE_SEGMENTS = 96;

/** The legacy `feature._circle` marker attached to circle features. */
export interface CircleMeta {
  center: LngLat;
  radiusKm: number;
}

/** A drawn polygon feature, optionally tagged with its circle parameters. */
export type DrawFeature = GeoJSON.Feature<GeoJSON.Polygon> & { _circle?: CircleMeta };

/** The in-progress draw state the mouse handlers mutate (legacy `drawing`/`drawStart`/`drawPoly`/`drawGeo`). */
export interface DrawState {
  tool: DrawTool | null;
  drawing: boolean;
  start: LngLat | null;
  poly: [number, number][];
  feature: DrawFeature | null;
}

/** An empty draw state, legacy initial values (`jarvis.html` 1073). */
export function emptyDrawState(): DrawState {
  return { tool: null, drawing: false, start: null, poly: [], feature: null };
}

/** Great-circle distance in km between two lng/lat points (legacy `haversineKm`). */
export function haversineKm(a: LngLat, b: LngLat): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * A closed-able circle ring of `[lng, lat]` points drawn `n` segments around a centre (legacy
 * `geoCircle`, but taking the centre as `lng, lat` rather than a `[lng, lat]` tuple).
 */
export function geoCircle(lng: number, lat: number, radiusKm: number, n: number = CIRCLE_SEGMENTS): [number, number][] {
  const R = 6371.0088;
  const d = radiusKm / R;
  const p1 = (lat * Math.PI) / 180;
  const l1 = (lng * Math.PI) / 180;
  const dest = (brg: number): [number, number] => {
    const t = (brg * Math.PI) / 180;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
    const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [(l2 * 180) / Math.PI, (p2 * 180) / Math.PI];
  };
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) pts.push(dest((i / n) * 360));
  return pts;
}

/** A circle draw feature, min radius 1 km, ring closed (legacy `circleFeature`). */
export function circleFeature(center: LngLat, radiusKm: number): DrawFeature {
  const ring = geoCircle(center.lng, center.lat, Math.max(radiusKm, 1), CIRCLE_SEGMENTS);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length > 1 && first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push(first);
  return {
    type: 'Feature',
    properties: { kind: 'fill', shape: 'circle' },
    geometry: { type: 'Polygon', coordinates: [ring] },
    _circle: { center, radiusKm },
  };
}

/** An axis-aligned rectangle feature from two opposite corners (legacy `rectFeature`). */
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

/** A freeform polygon feature from `[lng, lat]` points, ring closed (legacy `polyFeature`). */
export function polyFeature(pts: [number, number][]): DrawFeature {
  const ring = pts.map((p) => [p[0], p[1]] as [number, number]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length > 2 && first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([first[0], first[1]]);
  }
  return {
    type: 'Feature',
    properties: { kind: 'fill', shape: 'polygon' },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

/** Ray-casting point-in-polygon on an `[lng, lat]` ring (legacy `pointInRing`). */
export function pointInRing(ring: number[][], lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ri = ring[i];
    const rj = ring[j];
    if (!ri || !rj) continue;
    const xi = ri[0];
    const yi = ri[1];
    const xj = rj[0];
    const yj = rj[1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when `(lat, lng)` falls inside a drawn shape (legacy `insideShape`). */
export function insideShape(shape: DrawFeature, lat: number, lng: number): boolean {
  if (shape._circle) return haversineKm(shape._circle.center, { lat, lng }) <= shape._circle.radiusKm;
  const ring = shape.geometry.coordinates[0];
  return ring ? pointInRing(ring as unknown as number[][], lng, lat) : false;
}

/** The nearest plotted marker within ~25 km of `(lat,lng)`, or null (legacy `nearestMapPoint`). */
export function nearestMapPoint(lat: number, lng: number, points: MapPoint[]): MapPoint | null {
  let best: MapPoint | null = null;
  let bd = 0.25; // degrees; the nearest marker within ~25 km wins
  for (const p of points) {
    const d = Math.hypot(p.lat - lat, p.lng - lng);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/**
 * The markers inside a drawn shape (legacy `reselect` minus the source/render side effects). The
 * caller is responsible for the `src-selected` source and the selection panel.
 */
export function runSelection(shape: DrawFeature, mapPoints: MapPoint[]): MapPoint[] {
  return mapPoints.filter((p) => insideShape(shape, p.lat, p.lng));
}

/** Convert a drawn feature into the app-wide `Shape` used by `?shape=` (`state/url.ts`). */
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
