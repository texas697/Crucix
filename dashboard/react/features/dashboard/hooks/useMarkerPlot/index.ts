import { useEffect, useMemo, useRef } from 'react';
import type { SweepData } from '../../../../api/types';
import type { TimeWindow } from '../../../map/layerDefs';
import type { MapLabel } from '../../../map/MapView';
import { plotData, type QuakeRow, type TrackRow } from '../../../map/plot';
import type { RegionKey } from '../../../map/regions';
import type { QuakeItem, TrackItem } from '../../types';
import type { MarkerPlot } from '../../stateTypes';

export interface UseMarkerPlotArgs {
  data: SweepData | null;
  layerVisible: Record<string, boolean>;
  region: RegionKey;
  timeWindow: TimeWindow;
  tracks: TrackItem[] | null;
  quakes: QuakeItem[] | null;
}

export function useMarkerPlot({ data, layerVisible, region, timeWindow, tracks, quakes }: UseMarkerPlotArgs): MarkerPlot {
  const seenMarkersRef = useRef<Set<string> | null>(null);

  const plot = useMemo(() => {
    if (!data) return null;
    return plotData({
      data,
      layerVisible,
      region,
      timeWindow,
      seenMarkers: seenMarkersRef.current,
      showAggregates: true,
      tracks: tracks ? { tracks: tracks as TrackRow[] } : null,
      ships: null,
      quakes: (quakes as QuakeRow[] | null) ?? null,
    });
  }, [data, layerVisible, region, timeWindow, tracks, quakes]);

  useEffect(() => {
    if (plot) seenMarkersRef.current = plot.nextSeen;
  }, [plot]);

  const mapLabels = useMemo<MapLabel[]>(
    () => (plot?.labels ?? []).map((l) => ({ text: l.text, anchor: [l.lng, l.lat] as [number, number], region: l.region })),
    [plot],
  );

  return useMemo(() => ({ plot, mapLabels }), [plot, mapLabels]);
}
