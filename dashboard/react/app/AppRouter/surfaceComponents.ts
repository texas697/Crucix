import { createPreloadableSurface } from './preloadableSurface';
import type { DigestSurfaceProps, SurfaceComponents, SurfaceLoaders } from './types';

const dashboard = createPreloadableSurface(() => import('../../features/dashboard').then((m) => m.DashboardApp));
const digest = createPreloadableSurface<DigestSurfaceProps>(() => import('../../features/digest').then((m) => m.DigestApp));
const media = createPreloadableSurface(() => import('../../features/media').then((m) => m.MediaApp));

export const LAZY_SURFACES: SurfaceComponents = { dashboard, digest, media };

export const SURFACE_LOADERS: SurfaceLoaders = {
  dashboard: dashboard.preload,
  digest: digest.preload,
  media: media.preload,
};
