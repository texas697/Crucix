import type { AuthGlobals } from './types';

export function readAuthGlobals(): AuthGlobals {
  if (typeof window === 'undefined') return {};
  return window as unknown as AuthGlobals;
}
