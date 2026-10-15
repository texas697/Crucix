import { useCallback, useMemo, useState, type RefObject } from 'react';
import type { MapViewHandle } from '../../../features/map/MapView';
import type { PlotResult } from '../../../features/map/plot';
import { nearestMapPoint } from '../../../features/map/selection';
import { copyToClipboard } from '../../../shared/copyToClipboard';
import type { PopupInfo, SnapshotPopupState } from '../../types';

export interface UseSnapshotPopupArgs {
  mapRef: RefObject<MapViewHandle | null>;
  plot: PlotResult | null;
}

function projectedPercent(mapRef: RefObject<MapViewHandle | null>, lng: number, lat: number): { left: number; top: number } {
  const map = mapRef.current?.getMap();
  if (!map) return { left: 50, top: 50 };
  const projected = map.project([lng, lat]);
  const rect = map.getContainer().getBoundingClientRect();
  if (!rect.width || !rect.height) return { left: 50, top: 50 };
  return { left: (projected.x / rect.width) * 100, top: (projected.y / rect.height) * 100 };
}

export function useSnapshotPopup({ mapRef, plot }: UseSnapshotPopupArgs): SnapshotPopupState {
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  const onCanvasClick = useCallback((info: { lng: number; lat: number }) => {
    if (!plot) return;
    const point = nearestMapPoint(info.lat, info.lng, plot.mapPoints);
    if (!point) return;
    const { left, top } = projectedPercent(mapRef, point.lng, point.lat);
    setPopup({
      head: point.popHead, text: point.popText, meta: point.popMeta, url: point.url, isNew: point._new,
      lng: point.lng, lat: point.lat, left, top,
    });
  }, [plot, mapRef]);

  const onClosePopup = useCallback(() => setPopup(null), []);

  const onCopyPopup = useCallback(() => {
    if (popup) copyToClipboard(`${popup.lng.toFixed(4)},${popup.lat.toFixed(4)}`);
  }, [popup]);

  return useMemo(() => ({ popup, onCanvasClick, onClosePopup, onCopyPopup }), [popup, onCanvasClick, onClosePopup, onCopyPopup]);
}
