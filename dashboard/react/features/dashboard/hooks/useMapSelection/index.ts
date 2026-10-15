import { useCallback, useMemo, useState, type RefObject } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { HistoryAdapter } from '../../../../state/history';
import { parseUrl, shapeToUrl, type Shape } from '../../../../state/url';
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
  href: string;
  history: HistoryAdapter;
}

export function useMapSelection({ api, mapRef, plot, href, history }: UseMapSelectionArgs): MapSelectionState {
  const [drawTool, setDrawTool] = useState<DrawTool | null>(null);
  const [selected, setSelected] = useState<MapPoint[]>([]);
  const [brief, setBrief] = useState<AreaBriefState>(EMPTY_AREA_BRIEF);

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
    const { path, q } = parseUrl(href);
    if (!q.shape) return;
    if (history.afterClose('shape') === 'rewrite') history.set(path, { ...q, shape: '' }, { isPush: false });
  }, [href, history]);

  const onDrawComplete = useCallback((shape: Shape) => {
    setBrief(EMPTY_AREA_BRIEF);
    if (plot) {
      setSelected(runSelection(shapeToFeature(shape), plot.mapPoints));
      void loadAreaBrief(api, {
        shape,
        markers: markersPayload(plot.mapPoints),
        onUpdate: (patch) => setBrief((cur) => ({ ...cur, ...patch })),
      });
    }
    history.set('/', { shape: shapeToUrl(shape) }, { isPush: true, state: { k: 'shape' } });
  }, [plot, api, history]);

  const onDrawCancel = useCallback(() => setDrawTool(null), []);

  const onFocusSelection = useCallback((index: number) => {
    const point = selected[index];
    if (point) mapRef.current?.flyToPoint(point.lng, point.lat, 5);
  }, [selected, mapRef]);

  return useMemo(() => ({
    drawTool, selected, selectedFC, brief, setDrawTool, onDrawComplete, onDrawCancel, onClearSelection, onFocusSelection,
  }), [drawTool, selected, selectedFC, brief, onDrawComplete, onDrawCancel, onClearSelection, onFocusSelection]);
}
