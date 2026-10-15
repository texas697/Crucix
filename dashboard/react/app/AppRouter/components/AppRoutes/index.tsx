import { useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '../../../AppShell';
import { readHasTavily } from '../../../bootGlobals';
import { isReactSurface, readUiFlags } from '../../../uiFlags';
import { useSurfacePreload } from '../../hooks/useSurfacePreload';
import { LAZY_SURFACES, SURFACE_LOADERS } from '../../surfaceComponents';
import type { AppRoutesProps } from '../../types';
import { SurfaceMount } from '../SurfaceMount';

export function AppRoutes({ surfaces = LAZY_SURFACES, loaders = SURFACE_LOADERS }: AppRoutesProps) {
  const flags = useMemo(() => readUiFlags(), []);
  const hasTavily = useMemo(() => readHasTavily(), []);
  const Dashboard = surfaces.dashboard;
  const Digest = surfaces.digest;
  const Media = surfaces.media;
  const Telegram = surfaces.telegram;
  useSurfacePreload({ loaders, flags });

  return (
    <Routes>
      <Route element={<AppShell />}>
        {isReactSurface(flags, 'dashboard') && (
          <Route path="/" element={<SurfaceMount key="dashboard" surface="dashboard"><Dashboard /></SurfaceMount>} />
        )}
        {isReactSurface(flags, 'digest') && (
          <Route path="/digest/:id?" element={<SurfaceMount key="digest" surface="digest"><Digest hasTavily={hasTavily} /></SurfaceMount>} />
        )}
        {isReactSurface(flags, 'media') && (
          <Route path="/media/:channel?" element={<SurfaceMount key="media" surface="media"><Media /></SurfaceMount>} />
        )}
        {isReactSurface(flags, 'telegram') && (
          <Route path="/telegram/:id?" element={<SurfaceMount key="telegram" surface="telegram"><Telegram /></SurfaceMount>} />
        )}
      </Route>
    </Routes>
  );
}
