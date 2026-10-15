import { Suspense, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import { CLASSES } from '../../../classes';
import type { Surface } from '../../../surfaces';
import { SurfaceFallback } from '../SurfaceFallback';

export interface SurfaceMountProps {
  surface: Surface;
  children: ReactNode;
}

export function SurfaceMount({ surface, children }: SurfaceMountProps) {
  return (
    <Box className={CLASSES.surface} data-surface={surface}>
      <Suspense fallback={<SurfaceFallback />}>{children}</Suspense>
    </Box>
  );
}
