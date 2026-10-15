import { useEffect } from 'react';
import type { Map as MaplibreMap, MapStyleImageMissingEvent } from 'maplibre-gl';
import { PLANE_ICON_ID } from '../../consts';
import { registerPlaneIcon } from '../../planeIcon';

export interface UsePlaneIconArgs {
  getMap: () => MaplibreMap | null;
  isLoaded: boolean;
}

export function usePlaneIcon({ getMap, isLoaded }: UsePlaneIconArgs): void {
  useEffect(() => {
    const map = getMap();
    if (!isLoaded || !map) return undefined;
    registerPlaneIcon(map);
    const onMissing = (event: MapStyleImageMissingEvent) => {
      if (event.id === PLANE_ICON_ID) registerPlaneIcon(map);
    };
    map.on('styleimagemissing', onMissing);
    return () => {
      map.off('styleimagemissing', onMissing);
    };
  }, [getMap, isLoaded]);
}
