import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MapRef } from 'react-map-gl/maplibre';

export interface UseMapInstanceArgs {
  onReady?: () => void;
}

export interface MapInstanceState {
  mapRef: RefObject<MapRef | null>;
  isLoaded: boolean;
  getMap: () => MaplibreMap | null;
  onLoad: () => void;
}

export function useMapInstance({ onReady }: UseMapInstanceArgs): MapInstanceState {
  const mapRef = useRef<MapRef | null>(null);
  const onReadyRef = useRef(onReady);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const getMap = useCallback((): MaplibreMap | null => mapRef.current?.getMap() ?? null, []);

  const onLoad = useCallback(() => {
    setIsLoaded(true);
    onReadyRef.current?.();
  }, []);

  return useMemo(() => ({ mapRef, isLoaded, getMap, onLoad }), [isLoaded, getMap, onLoad]);
}
