import { useCallback, useEffect, useRef } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { CLICK_LAYERS } from '../../consts';
import type { CanvasClickInfo, MapFeatureCollection } from '../../types';
import { nearestPointFeature, toPopupFeature } from '../../utils';

export interface UseCanvasClickArgs {
  getMap: () => MaplibreMap | null;
  points: MapFeatureCollection;
  onCanvasClick?: (info: CanvasClickInfo) => void;
}

export function useCanvasClick({ getMap, points, onCanvasClick }: UseCanvasClickArgs): (event: MapLayerMouseEvent) => void {
  const latestRef = useRef({ points, onCanvasClick });

  useEffect(() => {
    latestRef.current = { points, onCanvasClick };
  }, [points, onCanvasClick]);

  return useCallback((event: MapLayerMouseEvent) => {
    const map = getMap();
    const callback = latestRef.current.onCanvasClick;
    if (!map || !callback) return;
    const layers = CLICK_LAYERS.filter((id) => map.getLayer(id));
    const hits = layers.length ? map.queryRenderedFeatures(event.point, { layers }) : [];
    callback({
      lng: event.lngLat.lng,
      lat: event.lngLat.lat,
      features: hits.map(toPopupFeature),
      point: nearestPointFeature(latestRef.current.points, event.lngLat.lng, event.lngLat.lat),
    });
  }, [getMap]);
}
