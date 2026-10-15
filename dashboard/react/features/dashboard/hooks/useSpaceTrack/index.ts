import { useEffect, useMemo, useState } from 'react';
import type { SweepData } from '../../../../api/types';
import { createSpaceLive, groundTrack, type SpaceStation } from '../../../map/spaceLive';

export interface UseSpaceTrackArgs {
  isMapReady: boolean;
  data: SweepData | null;
}

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const TICK_MS = 5000;

export function useSpaceTrack({ isMapReady, data }: UseSpaceTrackArgs): GeoJSON.FeatureCollection {
  const [spaceTrack, setSpaceTrack] = useState<GeoJSON.FeatureCollection>(EMPTY);

  const stations = useMemo<SpaceStation[] | null>(() => {
    const list = data?.space?.stations;
    return Array.isArray(list) ? (list as SpaceStation[]) : null;
  }, [data]);

  useEffect(() => {
    if (!isMapReady || !stations || stations.length === 0) return undefined;
    const live = createSpaceLive({
      getStations: () => stations,
      onTick: (ticks) => {
        const features: GeoJSON.Feature[] = [];
        for (const { station } of ticks) {
          if (!station.primary) continue;
          for (const segment of groundTrack(station)) {
            features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: segment } });
          }
        }
        setSpaceTrack({ type: 'FeatureCollection', features });
      },
      intervalMs: TICK_MS,
    });
    live.start();
    return () => live.stop();
  }, [isMapReady, stations]);

  return spaceTrack;
}
