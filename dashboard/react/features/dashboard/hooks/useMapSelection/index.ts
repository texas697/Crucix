import { useCallback, useMemo, useState, type RefObject } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { HistoryAdapter } from '../../../../state/history';
import { shapeToUrl, type Shape } from '../../../../state/url';
import { EMPTY_AREA_BRIEF, loadAreaBrief, markersPayload, type AreaBriefState } from '../../../map/AreaBrief';
import type { MapViewHandle } from '../../../map/MapView';
import type { MapPoint, PlotResult } from '../../../map/plot';
import { runSelection, type DrawTool } from '../../../map/selection';
import { shapeToFeature } from '../../../map/shapeToFeature';
import type { MapSelectionState } from '../../stateTypes';

export interface UseMapSelectionArgs {
  api: ApiClient;
  mapRef: RefObject<MapViewHandle | null>;
  plot: PlotResult | null;
  history: HistoryAdapter;
}

export function useMapSelection({ api, mapRef, plot, history }: UseMapSelectionArgs): MapSelectionState {
  const [drawTool, setDrawTool] = useState<DrawTool | null>(null);
  const [selected, setSelected] = useState<MapPoint[]>([]);
  const [brief, setBrief] = useState<AreaBriefState>(EMPTY_AREA_BRIEF);
  const [briefError, setBriefError] = useState<string | null>(null);

  const selectedFC = useMemo(() => ({
    type: 'FeatureCollection',
    features: selected.map((p) => ({
      type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  }) as GeoJSON.FeatureCollection, [selected]);

  const onClearSelection = useCallback(() => {
    setSelected([]);
    setBrief(EMPTY_AREA_BRIEF);
    setDrawTool(null);
  }, []);

  const onDrawComplete = useCallback((shape: Shape) => {
    setDrawTool(null);
    setBrief(EMPTY_AREA_BRIEF);
    if (plot) {
      setSelected(runSelection(shapeToFeature(shape), plot.mapPoints));
      void loadAreaBrief(api, {
        shape,
        markers: markersPayload(plot.mapPoints),
        onUpdate: (patch) => setBrief((cur) => ({ ...cur, ...patch })),
        onError: (err) => setBriefError(err.message),
      });
    }
    history.set('/', { shape: shapeToUrl(shape) }, { push: true, state: { k: 'shape' } });
  }, [plot, api, history]);

  const onDrawCancel = useCallback(() => setDrawTool(null), []);

  const onFocusSelection = useCallback((index: number) => {
    const point = selected[index];
    if (point) mapRef.current?.flyToPoint(point.lng, point.lat, 5);
  }, [selected, mapRef]);

  return useMemo(() => ({
    drawTool, selected, selectedFC, brief, briefError, setDrawTool, onDrawComplete, onDrawCancel, onClearSelection, onFocusSelection,
  }), [drawTool, selected, selectedFC, brief, briefError, onDrawComplete, onDrawCancel, onClearSelection, onFocusSelection]);
}
