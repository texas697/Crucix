import { BASEMAP_LABELS, BASEMAP_ORDER } from './consts';
import type { BasemapKey } from './types';

export function nextBasemap(current: BasemapKey): BasemapKey {
  const i = BASEMAP_ORDER.indexOf(current);
  return BASEMAP_ORDER[(i + 1) % BASEMAP_ORDER.length]!;
}

export function basemapLabel(key: BasemapKey): string {
  return BASEMAP_LABELS[key];
}
