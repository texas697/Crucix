import { useMemo, useRef } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { SweepData } from '../../../../api/types';
import type { HistoryAdapter } from '../../../../state/history';
import type { MapViewHandle } from '../../../map/MapView';
import type { QuakeItem, TrackItem } from '../../types';
import type { DashboardMapState } from '../../stateTypes';
import { useDashboardRegion } from '../useDashboardRegion';
import { useLayerControls } from '../useLayerControls';
import { useMapPopup } from '../useMapPopup';
import { useMapReady } from '../useMapReady';
import { useMapSelection } from '../useMapSelection';
import { useMarkerPlot } from '../useMarkerPlot';
import { useSpaceTrack } from '../useSpaceTrack';

export interface UseDashboardMapArgs {
  api: ApiClient;
  data: SweepData | null;
  tracks: TrackItem[] | null;
  quakes: QuakeItem[] | null;
  href: string;
  history: HistoryAdapter;
}

export function useDashboardMap({ api, data, tracks, quakes, href, history }: UseDashboardMapArgs): DashboardMapState {
  const mapRef = useRef<MapViewHandle>(null);
  const ready = useMapReady();
  const region = useDashboardRegion({ mapRef, href, history });
  const layers = useLayerControls();
  const { plot, mapLabels } = useMarkerPlot({
    data, layerVisible: layers.layerVisible, region: region.region, timeWindow: layers.timeWindow, tracks, quakes,
  });
  const selection = useMapSelection({ api, mapRef, plot, history });
  const popup = useMapPopup({ mapRef, plot, isMapReady: ready.isMapReady, href });
  const spaceTrack = useSpaceTrack({ isMapReady: ready.isMapReady, data });

  return useMemo(
    () => ({ mapRef, ready, region, layers, plot, mapLabels, selection, popup, spaceTrack }),
    [ready, region, layers, plot, mapLabels, selection, popup, spaceTrack],
  );
}
