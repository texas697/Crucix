import type { Surface } from './surfaces';

// Server-injected UI ownership flags. The server writes `window.__CRUCIX_UI__` (an object like
// `{ dashboard:'react', digest:'react', media:'react', login:'legacy' }`) before the SPA entry runs.
// A surface is React-owned only when its flag is exactly 'react'; any other value means the server
// serves that surface's legacy document, so the SPA must not render it.
//
// Defaults are defensive: when the global is absent (unit tests, or a server that predates the
// injection) every migrated surface is treated as React so the SPA renders without injection.

export type UiFlags = Partial<Record<Surface, string>>;

export const DEFAULT_UI_FLAGS: UiFlags = { dashboard: 'react', digest: 'react', media: 'react' };

/** Read `window.__CRUCIX_UI__`, merged over the defensive defaults. Never throws. */
export function readUiFlags(): UiFlags {
  const raw = (globalThis as { __CRUCIX_UI__?: unknown }).__CRUCIX_UI__;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...DEFAULT_UI_FLAGS, ...(raw as UiFlags) };
  }
  return { ...DEFAULT_UI_FLAGS };
}

/** True when the SPA owns (renders) the given surface. */
export function isReactSurface(flags: UiFlags, surface: Surface): boolean {
  return flags[surface] === 'react';
}
