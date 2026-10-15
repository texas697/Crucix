import { useCallback, useMemo, useState, type RefObject } from 'react';
import type { HistoryAdapter } from '../../../../state/history';
import { parseUrl } from '../../../../state/url';
import type { MapViewHandle } from '../../../map/MapView';
import { REGION_LABEL, clampRegion, type RegionKey } from '../../../map/regions';
import type { DashboardRegionState } from '../../stateTypes';

export interface UseDashboardRegionArgs {
  mapRef: RefObject<MapViewHandle | null>;
  href: string;
  history: HistoryAdapter;
}

const STORAGE_KEY = 'crucix_region';

function initialRegion(href: string): RegionKey {
  const q = parseUrl(href).q;
  if (q.region) return clampRegion(q.region);
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) return clampRegion(stored);
  } catch {
    return 'world';
  }
  return 'world';
}

function rememberRegion(region: RegionKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, region);
  } catch {
    return;
  }
}

export function useDashboardRegion({ mapRef, href, history }: UseDashboardRegionArgs): DashboardRegionState {
  const [region, setRegionState] = useState<RegionKey>(() => initialRegion(href));

  const setRegion = useCallback((next: RegionKey) => {
    setRegionState(next);
    rememberRegion(next);
    mapRef.current?.flyToRegion(next);
    history.set('/', { region: next !== 'world' ? next : '' }, { push: true, state: { k: 'region' } });
  }, [mapRef, history]);

  const onSearchRegion = useCallback((query: string) => {
    const needle = query.trim().toLowerCase();
    const hit = (Object.entries(REGION_LABEL) as [RegionKey, string][]).find(([, label]) => label.toLowerCase() === needle);
    if (hit) setRegion(hit[0]);
  }, [setRegion]);

  const onClearRegion = useCallback(() => setRegion('world'), [setRegion]);

  return useMemo(() => ({ region, setRegion, onSearchRegion, onClearRegion }), [region, setRegion, onSearchRegion, onClearRegion]);
}
