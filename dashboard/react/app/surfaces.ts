export const SURFACES = ['dashboard', 'digest', 'media', 'login'] as const;

export type Surface = (typeof SURFACES)[number];

export type NavSurface = Exclude<Surface, 'login'>;

export const NAV_SURFACES: readonly NavSurface[] = ['dashboard', 'digest', 'media'];

export const SURFACE_TITLES: Record<Surface, string> = {
  dashboard: 'Dashboard',
  digest: 'Readers Digest',
  media: 'Live media',
  login: 'Sign in',
};

export const SURFACE_PATHS: Record<NavSurface, string> = {
  dashboard: '/',
  digest: '/digest',
  media: '/media',
};

export function isSurface(value: string): value is Surface {
  return (SURFACES as readonly string[]).includes(value);
}

export function surfaceForPathname(pathname: string): NavSurface | null {
  if (pathname === '/' || pathname === '') return 'dashboard';
  if (pathname === '/digest' || pathname.startsWith('/digest/')) return 'digest';
  if (pathname === '/media' || pathname.startsWith('/media/')) return 'media';
  return null;
}
