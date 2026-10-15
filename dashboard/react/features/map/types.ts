import type { Map as MaplibreMap } from 'maplibre-gl';
import type { Shape } from '../../state/url';
import type { Theme } from '../../shared/theme';
import type { DrawTool } from './selection';

export type MapFeatureCollection = GeoJSON.FeatureCollection;

export interface MapViewHandle {
  resize(): void;
  flyToRegion(region: string): void;
  flyToPoint(lng: number, lat: number, zoom?: number): void;
  getMap(): MaplibreMap | null;
  project(lng: number, lat: number): { x: number; y: number } | null;
  enableDragPan(enabled: boolean): void;
}

export interface MapLabel {
  text: string;
  anchor: [number, number];
  region?: string;
}

export interface PopupFeature {
  head?: string;
  text?: string;
  meta?: string;
  url?: string;
  isNew?: boolean;
  [key: string]: unknown;
}

export interface CanvasClickInfo {
  lng: number;
  lat: number;
  features: PopupFeature[];
  point?: [number, number];
}

export interface MapViewProps {
  theme: Theme;
  points: MapFeatureCollection;
  labels: MapLabel[];
  rings: MapFeatureCollection;
  trails: MapFeatureCollection;
  spaceTrack?: MapFeatureCollection;
  region: string;
  selected?: MapFeatureCollection;
  drawTool?: DrawTool | null;
  onDrawComplete?: (shape: Shape) => void;
  onDrawCancel?: () => void;
  onReady?: () => void;
  onCanvasClick?: (info: CanvasClickInfo) => void;
}
