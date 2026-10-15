import { MILITARY_AIR_COLOR, MILITARY_AIR_KEY, PLANE_ICON_ID } from './consts';

export const MAP_SOURCES = [
  'src-space-track',
  'src-draw',
  'src-corridors',
  'src-trails',
  'src-conflict',
  'src-rings',
  'src-points',
  'src-selected',
] as const;

export type MapSourceId = (typeof MAP_SOURCES)[number];

export interface MapLayerDefinition {
  id: string;
  type: 'line' | 'fill' | 'circle' | 'symbol';
  source: MapSourceId;
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: unknown[];
}

export const MILITARY_TEXT_FONT = [
  'Montserrat Regular', 'Open Sans Regular', 'Noto Sans Regular', 'HanWangHeiLight Regular', 'NanumBarunGothic Regular',
];

const NOT_MILITARY = ['!=', ['get', 'type'], MILITARY_AIR_KEY];
const IS_MILITARY = ['==', ['get', 'type'], MILITARY_AIR_KEY];

export const MAP_LAYERS: MapLayerDefinition[] = [
  {
    id: 'lyr-space-track',
    type: 'line',
    source: 'src-space-track',
    paint: { 'line-color': 'rgba(255,255,255,0.45)', 'line-width': 1.1, 'line-dasharray': [2, 3] },
  },
  { id: 'lyr-draw-fill', type: 'fill', source: 'src-draw', paint: { 'fill-color': 'rgba(220,226,236,0.16)' } },
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
    filter: NOT_MILITARY,
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
    id: 'lyr-military',
    type: 'symbol',
    source: 'src-points',
    filter: IS_MILITARY,
    layout: {
      'icon-image': PLANE_ICON_ID,
      'icon-size': 0.3,
      'icon-rotate': ['coalesce', ['get', 'heading'], 0],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ['step', ['zoom'], '', 4, ['coalesce', ['get', 'label'], '']],
      'text-font': MILITARY_TEXT_FONT,
      'text-size': 10,
      'text-offset': [0, 1.1],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'icon-color': MILITARY_AIR_COLOR,
      'icon-halo-color': 'rgba(5,7,11,0.7)',
      'icon-halo-width': 0.6,
      'text-color': MILITARY_AIR_COLOR,
      'text-halo-color': 'rgba(5,7,11,0.9)',
      'text-halo-width': 1,
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

export function layersForSource(source: MapSourceId): MapLayerDefinition[] {
  return MAP_LAYERS.filter((layer) => layer.source === source);
}

export { BASEMAPS, basemapForTheme } from './basemaps';
export type { BasemapDefinition } from './basemaps';
