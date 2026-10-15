import type { Theme } from '../../shared/theme';

export interface BasemapDefinition {
  name: string;
  style: string;
}

export const BASEMAPS = [
  { name: 'Dark', style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
  { name: 'Muted', style: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json' },
  { name: 'Light', style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
] as const satisfies readonly BasemapDefinition[];

export function basemapForTheme(theme: Theme): string {
  return theme === 'light' ? BASEMAPS[2].style : BASEMAPS[0].style;
}
