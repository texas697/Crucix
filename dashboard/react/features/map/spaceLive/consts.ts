import type { BasemapKey } from './types';

export const SPACE_TICK_MS = 5000;

export const GROUND_TRACK_MINUTES = 46;

export const GROUND_TRACK_STEP_SEC = 60;

export const BASEMAP_ORDER: readonly BasemapKey[] = ['dark', 'muted', 'light'];

export const BASEMAP_LABELS: Record<BasemapKey, string> = {
  dark: 'Dark',
  muted: 'Muted',
  light: 'Light',
};
