// Static map sources, layers and basemaps, ported from the legacy `jarvis.html`:
//   - `setupMapLayers()` sources/layers (jarvis.html ~1791-1818)
//   - the `BASEMAPS` table (jarvis.html ~1076-1080)
//   - `applyThemeToMap()`'s theme -> basemap index rule (jarvis.html ~1059-1066)
//
// This module is intentionally free of any `maplibre-gl` *runtime* import so the definitions can be
// imported by tests (jsdom has no WebGL) and by callers that only need the tables.

import type { Theme } from '../../shared/theme';

/** The eight GeoJSON source ids `setupMapLayers` ensures, in legacy order. */
export const MAP_SOURCES = [
  'src-corridors',
  'src-trails',
  'src-draw',
  'src-selected',
  'src-rings',
  'src-points',
  'src-conflict',
  'src-space-track',
] as const;

export type MapSourceId = (typeof MAP_SOURCES)[number];

/**
 * A layer exactly as `setupMapLayers` adds it. Kept deliberately loose (rather than the strict
 * `LayerSpecification` union) so the legacy expression paint values port verbatim without casts
 * scattered through the table.
 */
export interface MapLayerDefinition {
  id: string;
  type: 'line' | 'fill' | 'circle';
  source: MapSourceId;
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

/** The nine layers `setupMapLayers` adds, in legacy add order. */
export const MAP_LAYERS: MapLayerDefinition[] = [
  {
    id: 'lyr-space-track',
    type: 'line',
    source: 'src-space-track',
    paint: { 'line-color': 'rgba(255,255,255,0.45)', 'line-width': 1.1, 'line-dasharray': [2, 3] },
  },
  {
    id: 'lyr-draw-fill',
    type: 'fill',
    source: 'src-draw',
    paint: { 'fill-color': 'rgba(220,226,236,0.16)' },
  },
  {
    id: 'lyr-draw-line',
    type: 'line',
    source: 'src-draw',
    paint: { 'line-color': '#dce2ec', 'line-width': 1.6, 'line-dasharray': [3, 2] },
  },
  {
    id: 'lyr-corridors',
    type: 'line',
    source: 'src-corridors',
    paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'w'], 'line-opacity': 0.55 },
    layout: { 'line-cap': 'round' },
  },
  {
    id: 'lyr-trails',
    type: 'line',
    source: 'src-trails',
    paint: { 'line-color': ['get', 'color'], 'line-width': 1.6, 'line-opacity': 0.8 },
    layout: { 'line-cap': 'round' },
  },
  {
    id: 'lyr-conflict',
    type: 'circle',
    source: 'src-conflict',
    paint: {
      'circle-color': 'rgba(245,154,94,0.12)',
      'circle-radius': ['get', 'r'],
      'circle-stroke-color': 'rgba(245,154,94,0.85)',
      'circle-stroke-width': 1.4,
    },
  },
  {
    id: 'lyr-rings',
    type: 'circle',
    source: 'src-rings',
    paint: {
      'circle-color': 'rgba(220,226,236,0.08)',
      'circle-radius': ['get', 'r'],
      'circle-stroke-color': 'rgba(220,226,236,0.6)',
      'circle-stroke-width': 1,
    },
  },
  {
    id: 'lyr-points',
    type: 'circle',
    source: 'src-points',
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        0.5, ['*', ['get', 'r'], 0.9],
        2, ['get', 'r'],
        6, ['*', ['get', 'r'], 1.4],
        10, ['*', ['get', 'r'], 1.8],
      ],
      'circle-stroke-color': ['get', 'stroke'],
      'circle-stroke-width': 0.8,
      'circle-opacity': 0.92,
    },
  },
  {
    id: 'lyr-selected',
    type: 'circle',
    source: 'src-selected',
    paint: {
      'circle-color': 'rgba(0,0,0,0)',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0.5, 6, 4, 9, 10, 14],
      'circle-stroke-color': '#dce2ec',
      'circle-stroke-width': 2,
    },
  },
];

export interface BasemapDefinition {
  name: string;
  style: string;
}

/** Carto basemaps; the legacy array index is meaningful (0 dark, 2 light). */
export const BASEMAPS = [
  { name: 'Dark', style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { name: 'Muted', style: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json' },
  { name: 'Light', style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
] as const satisfies readonly BasemapDefinition[];

/** Theme -> basemap URL, mirroring `currentTheme==='light' ? idx 2 : idx 0`. */
export function basemapForTheme(theme: Theme): string {
  return theme === 'light' ? BASEMAPS[2].style : BASEMAPS[0].style;
}
