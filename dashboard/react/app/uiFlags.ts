import type { Surface } from './surfaces';

export type UiFlags = Partial<Record<Surface, string>>;

export const DEFAULT_UI_FLAGS: UiFlags = { dashboard: 'react', digest: 'react', media: 'react' };

export function readUiFlags(): UiFlags {
  const raw = (globalThis as { __CRUCIX_UI__?: unknown }).__CRUCIX_UI__;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...DEFAULT_UI_FLAGS, ...(raw as UiFlags) };
  }
  return { ...DEFAULT_UI_FLAGS };
}

export function isReactSurface(flags: UiFlags, surface: Surface): boolean {
  return flags[surface] === 'react';
}
