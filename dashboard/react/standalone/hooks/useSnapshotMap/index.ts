import { useMemo, useRef } from 'react';
import type { SweepData } from '../../../api/types';
import type { MapViewHandle } from '../../../features/map/MapView';
import type { SnapshotMapState } from '../../types';
import { useSnapshotLayers } from '../useSnapshotLayers';
import { useSnapshotPlot } from '../useSnapshotPlot';
import { useSnapshotPopup } from '../useSnapshotPopup';
import { useSnapshotRegion } from '../useSnapshotRegion';
import { useSnapshotSelection } from '../useSnapshotSelection';

export interface UseSnapshotMapArgs {
  data: SweepData | null;
}

export function useSnapshotMap({ data }: UseSnapshotMapArgs): SnapshotMapState {
  const mapRef = useRef<MapViewHandle>(null);
  const region = useSnapshotRegion({ mapRef });
  const layers = useSnapshotLayers();
  const { plot, mapLabels } = useSnapshotPlot({
    data, layerVisible: layers.layerVisible, region: region.region, timeWindow: layers.timeWindow,
  });
  const selection = useSnapshotSelection({ mapRef, plot });
  const popup = useSnapshotPopup({ mapRef, plot });

  return useMemo(
    () => ({ mapRef, plot, mapLabels, region, layers, selection, popup }),
    [plot, mapLabels, region, layers, selection, popup],
  );
}
