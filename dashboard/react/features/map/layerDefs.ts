import { MILITARY_AIR_COLOR, MILITARY_AIR_KEY } from './consts';
import { inActiveRegion, type RegionKey } from './regions';

export interface LayerDef {
  key: string;
  label: string;
  color: string;
}

export const LAYER_DEFS: LayerDef[] = [
  { key: 'air', label: 'Air', color: '#7fe0c0' },
  { key: MILITARY_AIR_KEY, label: 'Military air', color: MILITARY_AIR_COLOR },
  { key: 'thermal', label: 'Thermal', color: '#ff6b74' },
  { key: 'conflict', label: 'Conflict', color: '#f59a5e' },
  { key: 'maritime', label: 'Chokepoints', color: '#b48cff' },
  { key: 'ships', label: 'Ships', color: '#7fc8ff' },
  { key: 'nuke', label: 'Nuclear', color: '#f2c879' },
  { key: 'sdr', label: 'SDR', color: '#6aa8ff' },
  { key: 'health', label: 'Health', color: '#7fe0c0' },
  { key: 'news', label: 'News', color: '#8fb8d8' },
  { key: 'weather', label: 'Weather', color: '#f59a5e' },
  { key: 'radiation', label: 'RadNet', color: '#f2c879' },
  { key: 'space', label: 'Space', color: '#e9ecf2' },
  { key: 'gdelt', label: 'GDELT', color: '#6aa8ff' },
  { key: 'track', label: 'Tracks', color: '#ff9e6b' },
  { key: 'quake', label: 'Quakes', color: '#ffa94d' },
  { key: 'disaster', label: 'Disasters', color: '#ff8a5c' },
  { key: 'outage', label: 'Outages', color: '#c084fc' },
];

export const SELECTION_GROUP_LABELS: Record<string, string> = { [MILITARY_AIR_KEY]: 'Military aircraft' };

export const LAYER_SYNONYMS: Record<string, string[]> = {
  air: ['flight', 'flights', 'plane', 'aviation', 'opensky', 'aircraft', 'adsb'],
  militaryAir: ['military', 'mil', 'plane', 'aircraft', 'adsb', 'fighter', 'opensky'],
  thermal: ['fire', 'fires', 'wildfire', 'firms', 'heat', 'flare'],
  conflict: ['war', 'battle', 'clash', 'fatality', 'fatalities', 'violence'],
  maritime: ['sea', 'chokepoint', 'chokepoints', 'strait', 'shipping'],
  ships: ['ship', 'ships', 'vessel', 'vessels', 'ais', 'tanker', 'tankers', 'cargo', 'freighter'],
  nuke: ['nuclear', 'radiation', 'radnet', 'safecast', 'reactor'],
  sdr: ['radio', 'kiwisdr', 'receiver', 'antenna', 'signals'],
  health: ['who', 'outbreak', 'disease', 'epidemic', 'health'],
  news: ['rss', 'headline', 'headlines', 'media', 'press'],
  weather: ['storm', 'noaa', 'nws', 'alert', 'flood', 'hurricane'],
  radiation: ['radnet', 'epa', 'radiation', 'nuclear', 'safecast'],
  space: ['satellite', 'satellites', 'iss', 'orbit', 'orbital', 'space'],
  gdelt: ['event', 'events', 'geo', 'news volume'],
  disaster: ['disaster', 'disasters', 'gdacs', 'cyclone', 'typhoon', 'flood', 'volcano', 'drought', 'wildfire', 'earthquake'],
  outage: ['outage', 'outages', 'internet', 'ioda', 'shutdown', 'bgp', 'blackout'],
};

export const TIME_WINDOWS = { all: null, '1h': 3600000, '24h': 86400000, '7d': 604800000 } as const;

export const TIME_WINDOW_LIST = ['all', '1h', '24h', '7d'] as const;

export type TimeWindow = (typeof TIME_WINDOW_LIST)[number];

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = { all: 'All time', '1h': '1h', '24h': '24h', '7d': '7d' };

export function matchesLayerFilter(def: LayerDef, query: string): boolean {
  const q = (query || '').trim().toLowerCase();
  const label = def.label.toLowerCase();
  const syn = LAYER_SYNONYMS[def.key] || [];
  return !q || label.includes(q) || def.key.includes(q) || syn.some((s) => s.includes(q));
}

export interface LayerPoint {
  type?: string;
  lat?: number | null;
  lng?: number | null;
  ts?: string | number | null;
  [key: string]: unknown;
}

export interface PassOptions {
  visible: Record<string, boolean | undefined>;
  region: RegionKey | string;
  timeWindow: TimeWindow;
  now: number;
}

export function passesLayer(point: LayerPoint, { visible, region, timeWindow, now }: PassOptions): boolean {
  const w = TIME_WINDOWS[timeWindow];
  const ts = point.ts;
  const inTime = !w || !ts || (now - new Date(ts).getTime()) <= w;
  return !!visible[point.type ?? ''] && inActiveRegion(point.lat ?? NaN, point.lng ?? NaN, region) && inTime;
}

export { LAYER_INFO } from './layerInfo';
export type { LayerInfo } from './layerInfo';
