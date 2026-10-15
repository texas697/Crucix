import type * as GeoJSON from 'geojson';

export interface LngLat {
  lng: number;
  lat: number;
}

export type DrawTool = 'circle' | 'rect' | 'poly';

export interface CircleMeta {
  center: LngLat;
  radiusKm: number;
}

export type DrawFeature = GeoJSON.Feature<GeoJSON.Polygon> & { _circle?: CircleMeta };

export interface DrawState {
  tool: DrawTool | null;
  isDrawing: boolean;
  start: LngLat | null;
  poly: [number, number][];
  feature: DrawFeature | null;
}
