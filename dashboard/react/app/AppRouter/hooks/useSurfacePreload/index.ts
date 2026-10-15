import { useEffect } from 'react';
import { NAV_SURFACES } from '../../../surfaces';
import { isReactSurface, type UiFlags } from '../../../uiFlags';
import type { SurfaceLoader, SurfaceLoaders } from '../../types';

export interface UseSurfacePreloadArgs {
  loaders: SurfaceLoaders;
  flags: UiFlags;
}

interface IdleWindow {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}

const PRELOAD_DELAY_MS = 1500;

function routedLoaders(loaders: SurfaceLoaders, flags: UiFlags): SurfaceLoader[] {
  return NAV_SURFACES
    .filter((surface) => isReactSurface(flags, surface))
    .map((surface) => loaders[surface])
    .filter((load): load is SurfaceLoader => typeof load === 'function');
}

export function useSurfacePreload({ loaders, flags }: UseSurfacePreloadArgs): void {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const pending = routedLoaders(loaders, flags);
    if (pending.length === 0) return undefined;
    const run = () => {
      for (const load of pending) void load().catch(() => undefined);
    };
    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === 'function') {
      const handle = idleWindow.requestIdleCallback(run, { timeout: PRELOAD_DELAY_MS * 2 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(run, PRELOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loaders, flags]);
}
