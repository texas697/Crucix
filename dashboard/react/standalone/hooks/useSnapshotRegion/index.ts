import { useCallback, useMemo, useState, type RefObject } from 'react';
import type { MapViewHandle } from '../../../features/map/MapView';
import type { RegionKey } from '../../../features/map/regions';
import type { SnapshotRegionState } from '../../types';

export interface UseSnapshotRegionArgs {
  mapRef: RefObject<MapViewHandle | null>;
}

export function useSnapshotRegion({ mapRef }: UseSnapshotRegionArgs): SnapshotRegionState {
  const [region, setRegionState] = useState<RegionKey>('world');

  const setRegion = useCallback((next: RegionKey) => {
    setRegionState(next);
    mapRef.current?.flyToRegion(next);
  }, [mapRef]);

  const onClearRegion = useCallback(() => setRegion('world'), [setRegion]);

  return useMemo(() => ({ region, setRegion, onClearRegion }), [region, setRegion, onClearRegion]);
}
