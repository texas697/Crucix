import { useImperativeHandle, type ForwardedRef } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { POINT_FLY_ZOOM, REGION_BOUNDS, WORLD_CENTER, WORLD_ZOOM } from '../../consts';
import type { MapViewHandle } from '../../types';

export interface UseMapHandleArgs {
  ref: ForwardedRef<MapViewHandle>;
  getMap: () => MaplibreMap | null;
}

export function useMapHandle({ ref, getMap }: UseMapHandleArgs): void {
  useImperativeHandle(ref, () => ({
    resize() {
      getMap()?.resize();
    },
    flyToRegion(region: string) {
      const map = getMap();
      if (!map) return;
      if (region === 'world') {
        map.flyTo({ center: WORLD_CENTER, zoom: WORLD_ZOOM });
        return;
      }
      const box = REGION_BOUNDS[region];
      if (box) map.fitBounds(box);
    },
    flyToPoint(lng: number, lat: number, zoom = POINT_FLY_ZOOM) {
      getMap()?.flyTo({ center: [lng, lat], zoom });
    },
    getMap,
    project(lng: number, lat: number) {
      const map = getMap();
      if (!map) return null;
      const projected = map.project({ lng, lat });
      return { x: projected.x, y: projected.y };
    },
    enableDragPan(enabled: boolean) {
      const map = getMap();
      if (!map) return;
      if (enabled) map.dragPan.enable();
      else map.dragPan.disable();
    },
  }), [getMap]);
}
