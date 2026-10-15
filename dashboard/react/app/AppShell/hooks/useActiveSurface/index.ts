import { useLocation } from 'react-router-dom';
import { surfaceForPathname, type NavSurface } from '../../../surfaces';

export function useActiveSurface(): NavSurface | null {
  const { pathname } = useLocation();
  return surfaceForPathname(pathname);
}
