import type { ComponentType } from 'react';
import type { NavSurface } from '../surfaces';

export interface DigestSurfaceProps {
  hasTavily: boolean;
}

export interface SurfaceComponents {
  dashboard: ComponentType;
  digest: ComponentType<DigestSurfaceProps>;
  media: ComponentType;
  telegram: ComponentType;
}

export type SurfaceLoader = () => Promise<unknown>;

export type SurfaceLoaders = Partial<Record<NavSurface, SurfaceLoader>>;

export interface AppRoutesProps {
  surfaces?: SurfaceComponents;
  loaders?: SurfaceLoaders;
}
