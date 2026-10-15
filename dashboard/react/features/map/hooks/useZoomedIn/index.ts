import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { ZOOMED_IN_AT } from '../../consts';

export interface UseZoomedInArgs {
  getMap: () => MaplibreMap | null;
  isLoaded: boolean;
}

export interface ZoomedInState {
  isZoomedIn: boolean;
  onZoomEnd: () => void;
}

export function useZoomedIn({ getMap, isLoaded }: UseZoomedInArgs): ZoomedInState {
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  const onZoomEnd = useCallback(() => {
    const map = getMap();
    if (map) setIsZoomedIn(map.getZoom() >= ZOOMED_IN_AT);
  }, [getMap]);

  useEffect(() => {
    if (isLoaded) onZoomEnd();
  }, [isLoaded, onZoomEnd]);

  return useMemo(() => ({ isZoomedIn, onZoomEnd }), [isZoomedIn, onZoomEnd]);
}
