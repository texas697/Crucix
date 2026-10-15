import { useEffect, useMemo, useRef } from 'react';
import type { SweepData } from '../../../api/types';
import type { TimeWindow } from '../../../features/map/layerDefs';
import type { MapLabel } from '../../../features/map/MapView';
import { plotData, type PlotResult } from '../../../features/map/plot';
import type { RegionKey } from '../../../features/map/regions';

export interface UseSnapshotPlotArgs {
  data: SweepData | null;
  layerVisible: Record<string, boolean>;
  region: RegionKey;
  timeWindow: TimeWindow;
}

export interface SnapshotPlot {
  plot: PlotResult | null;
  mapLabels: MapLabel[];
}

export function useSnapshotPlot({ data, layerVisible, region, timeWindow }: UseSnapshotPlotArgs): SnapshotPlot {
  const seenMarkersRef = useRef<Set<string> | null>(null);

  const plot = useMemo(() => {
    if (!data) return null;
    return plotData({
      data, layerVisible, region, timeWindow, seenMarkers: seenMarkersRef.current, showAggregates: true,
      tracks: null, ships: null, quakes: null,
    });
  }, [data, layerVisible, region, timeWindow]);

  useEffect(() => {
    if (plot) seenMarkersRef.current = plot.nextSeen;
  }, [plot]);

  const mapLabels = useMemo<MapLabel[]>(
    () => (plot?.labels ?? []).map((l) => ({ text: l.text, anchor: [l.lng, l.lat] as [number, number], region: l.region })),
    [plot],
  );

  return useMemo(() => ({ plot, mapLabels }), [plot, mapLabels]);
}
