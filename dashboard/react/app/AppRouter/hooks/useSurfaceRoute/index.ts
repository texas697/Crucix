import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import type { HistoryAdapter, HistoryEntryState, HistoryKind, SetOptions } from '../../../../state/history';
import { buildUrl } from '../../../../state/url';

export interface SurfaceLocation {
  href: string;
  pathname: string;
  search: string;
}

export interface SurfaceRoute {
  location: SurfaceLocation;
  history: HistoryAdapter;
}

function documentOrigin(): string {
  if (typeof window === 'undefined') return 'http://localhost';
  const origin = window.location?.origin;
  return origin && origin !== 'null' ? origin : 'http://localhost';
}

function hasEntries(): boolean {
  return typeof window !== 'undefined' && window.history.length > 1;
}

export function useSurfaceRoute(): SurfaceRoute {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef<Location>(routerLocation);

  useEffect(() => {
    locationRef.current = routerLocation;
  }, [routerLocation]);

  const history = useMemo<HistoryAdapter>(() => {
    const current = () => locationRef.current.pathname + locationRef.current.search;
    const set = (path: string | string[], q: Record<string, unknown>, opts: SetOptions = {}): boolean => {
      const { isPush = false, state = null } = opts;
      const url = buildUrl(path, q);
      if (url === current()) {
        if (state && isPush) navigate(url, { replace: true, state });
        return false;
      }
      if (isPush) navigate(url, { state: state ?? {} });
      else navigate(url, { replace: true, state: state ?? locationRef.current.state ?? {} });
      return true;
    };
    const afterClose = (kind: HistoryKind): 'back' | 'rewrite' => {
      const state = locationRef.current.state as HistoryEntryState | null;
      if (state && state.k === kind && hasEntries()) {
        navigate(-1);
        return 'back';
      }
      return 'rewrite';
    };
    return { set, afterClose, here: current };
  }, [navigate]);

  const location = useMemo<SurfaceLocation>(() => ({
    href: documentOrigin() + routerLocation.pathname + routerLocation.search,
    pathname: routerLocation.pathname,
    search: routerLocation.search,
  }), [routerLocation.pathname, routerLocation.search]);

  return useMemo(() => ({ location, history }), [location, history]);
}
