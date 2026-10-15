// The four browser surfaces served by Express. Each has its own entry and lazy chunk; selection is
// server-controlled by the UI_* flags (see dashboard/server/ui.mjs) and never changes the URL.

export const SURFACES = ['dashboard', 'digest', 'media', 'login'] as const;

export type Surface = (typeof SURFACES)[number];

export const SURFACE_TITLES: Record<Surface, string> = {
  dashboard: 'Dashboard',
  digest: 'Readers Digest',
  media: 'Live media',
  login: 'Sign in',
};

export function isSurface(value: string): value is Surface {
  return (SURFACES as readonly string[]).includes(value);
}
