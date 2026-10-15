import { useCallback, useMemo, useState, type RefObject } from 'react';
import type { MapViewHandle } from '../../../features/map/MapView';
import type { MapPoint, PlotResult } from '../../../features/map/plot';
import { runSelection, type DrawTool } from '../../../features/map/selection';
import type { Shape } from '../../../state/url';
import { shapeToFeature } from '../../../features/map/shapeToFeature';
import type { SnapshotSelectionState } from '../../types';

export interface UseSnapshotSelectionArgs {
  mapRef: RefObject<MapViewHandle | null>;
  plot: PlotResult | null;
}

export function useSnapshotSelection({ mapRef, plot }: UseSnapshotSelectionArgs): SnapshotSelectionState {
  const [drawTool, setDrawTool] = useState<DrawTool | null>(null);
  const [selected, setSelected] = useState<MapPoint[]>([]);

  const selectedFC = useMemo(() => ({
    type: 'FeatureCollection',
    features: selected.map((p) => ({
      type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  }) as GeoJSON.FeatureCollection, [selected]);

  const onClearSelection = useCallback(() => {
    setSelected([]);
    setDrawTool(null);
  }, []);

  const onDrawComplete = useCallback((shape: Shape) => {
    if (plot) setSelected(runSelection(shapeToFeature(shape), plot.mapPoints));
  }, [plot]);

  const onDrawCancel = useCallback(() => setDrawTool(null), []);

  const onFocusSelection = useCallback((index: number) => {
    const point = selected[index];
    if (point) mapRef.current?.flyToPoint(point.lng, point.lat, 5);
  }, [selected, mapRef]);

  return useMemo(() => ({
    drawTool, selected, selectedFC, setDrawTool, onClearSelection, onDrawComplete, onDrawCancel, onFocusSelection,
  }), [drawTool, selected, selectedFC, onClearSelection, onDrawComplete, onDrawCancel, onFocusSelection]);
}
