import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './components/AppRoutes';

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export { AppRoutes } from './components/AppRoutes';
export { useSurfaceRoute } from './hooks/useSurfaceRoute';
export type { AppRoutesProps, SurfaceComponents, SurfaceLoaders } from './types';
