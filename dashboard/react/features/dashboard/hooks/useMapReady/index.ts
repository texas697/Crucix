import { useCallback, useMemo, useState } from 'react';
import type { MapReadyState } from '../../stateTypes';

export function useMapReady(): MapReadyState {
  const [isMapReady, setIsMapReady] = useState(false);
  const onMapReady = useCallback(() => setIsMapReady(true), []);
  return useMemo(() => ({ isMapReady, onMapReady }), [isMapReady, onMapReady]);
}
