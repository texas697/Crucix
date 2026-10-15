import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { POINT_FLY_ZOOM } from '../../consts';
import type { MapPoint, PlotResult } from '../../plot';
import { REGION_LABEL, type RegionKey } from '../../regions';
import type { MapViewHandle } from '../../types';

export interface UseMapSearchArgs {
  mapRef: RefObject<MapViewHandle | null>;
  plot: PlotResult | null;
  setRegion: (region: RegionKey) => void;
  onShowPoint: (point: MapPoint) => void;
}

export interface MapSearchState {
  onSearch: (query: string) => void;
}

const POPUP_DELAY_MS = 950;

function regionForQuery(q: string): RegionKey | null {
  const hit = (Object.entries(REGION_LABEL) as [RegionKey, string][])
    .find(([key, label]) => key !== 'world' && (label.toLowerCase().includes(q) || q.includes(key.toLowerCase())));
  return hit ? hit[0] : null;
}

function findMapMatch(points: MapPoint[], q: string): MapPoint | undefined {
  return points.find((point) => `${point.popHead || ''} ${point.popText || ''}`.toLowerCase().includes(q));
}

export function useMapSearch({ mapRef, plot, setRegion, onShowPoint }: UseMapSearchArgs): MapSearchState {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const onSearch = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const region = regionForQuery(q);
    if (region) {
      setRegion(region);
      return;
    }
    const match = plot ? findMapMatch(plot.mapPoints, q) : undefined;
    if (!match) return;
    mapRef.current?.flyToPoint(match.lng, match.lat, POINT_FLY_ZOOM);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onShowPoint(match), POPUP_DELAY_MS);
  }, [mapRef, plot, setRegion, onShowPoint]);

  return useMemo(() => ({ onSearch }), [onSearch]);
}
