import type * as GeoJSON from 'geojson';
import type { SweepData } from '../../../api/types';

export type LooseRecord = Record<string, unknown>;

export interface TrackRow {
  lat: number;
  lon: number;
  type?: string;
  title?: string;
  region?: string;
  locality?: string;
  heading?: number;
  confidence?: number | string;
  sourceCount?: number;
  updatedAt?: string;
  uncertaintyKm?: number;
  trail?: { lat: number; lng: number }[];
  explanation?: string;
  [key: string]: unknown;
}

export interface ShipRow {
  lat: number;
  lon: number;
  mmsi?: number | string;
  name?: string;
  cls?: string;
  sog?: number | null;
  cog?: number | null;
  nav?: number | null;
  dest?: string | null;
  len?: number | null;
  box?: string | null;
  ts?: string;
  [key: string]: unknown;
}

export interface ShipBox {
  label?: string;
  vessels?: number;
  tanker?: number;
  anchored?: number;
  military?: number;
  [key: string]: unknown;
}

export interface QuakeRow {
  lat: number;
  lon: number;
  id?: string;
  mag?: number;
  place?: string;
  depth?: number | null;
  ts?: string | null;
  url?: string | null;
  tsunami?: number | boolean | null;
  [key: string]: unknown;
}

export interface PlotShips {
  vessels?: ShipRow[];
  boxes?: Record<string, ShipBox>;
}

export interface PlotTracks {
  tracks?: TrackRow[];
}

export interface MapPoint {
  lat: number;
  lng: number;
  size: number;
  _r: number;
  color: string;
  _stroke: string;
  type: string;
  priority: number;
  ts?: string;
  url?: string;
  popHead: string;
  popMeta: string;
  popText: string;
  heading?: number | null;
  label?: string;
  _sat?: number;
  _id?: string;
  _new?: boolean;
}

export interface PlotInput {
  data: SweepData;
  layerVisible: Record<string, boolean>;
  region: string;
  timeWindow: 'all' | '1h' | '24h' | '7d';
  now?: number;
  seenMarkers: Set<string> | null;
  showAggregates: boolean;
  tracks?: PlotTracks | null;
  ships?: PlotShips | null;
  quakes?: QuakeRow[] | null;
}

export interface PlotLabel {
  text: string;
  lng: number;
  lat: number;
  region?: string;
  aggregate?: boolean;
}

export interface PlotResult {
  points: GeoJSON.FeatureCollection;
  rings: GeoJSON.FeatureCollection;
  trails: GeoJSON.FeatureCollection;
  labels: PlotLabel[];
  layerCounts: Record<string, number>;
  nextSeen: Set<string>;
  mapPoints: MapPoint[];
}

export interface InternalLabel {
  lat: number;
  lng: number;
  text: string;
  type: string;
}

export interface PlotContext {
  D: LooseRecord;
  input: PlotInput;
  now: number;
  points: MapPoint[];
  labels: InternalLabel[];
}

export type LayerPlotter = (ctx: PlotContext) => void;

export interface SatPos {
  lat: number;
  lon: number;
  alt: number | null;
  vel: number | null;
  live?: boolean;
}
