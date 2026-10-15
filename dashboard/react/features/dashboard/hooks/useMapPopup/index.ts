import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { copyToClipboard } from '../../../../shared/copyToClipboard';
import { parseUrl } from '../../../../state/url';
import type { MapViewHandle } from '../../../map/MapView';
import type { MapPoint, PlotResult } from '../../../map/plot';
import { nearestMapPoint } from '../../../map/selection';
import type { PopupInfo } from '../../types';
import type { MapPopupState } from '../../stateTypes';

export interface UseMapPopupArgs {
  mapRef: RefObject<MapViewHandle | null>;
  plot: PlotResult | null;
  isMapReady: boolean;
  href: string;
}

function projectedPercent(mapRef: RefObject<MapViewHandle | null>, lng: number, lat: number): { left: number; top: number } {
  const map = mapRef.current?.getMap();
  if (!map) return { left: 50, top: 50 };
  const projected = map.project([lng, lat]);
  const rect = map.getContainer().getBoundingClientRect();
  if (!rect.width || !rect.height) return { left: 50, top: 50 };
  return { left: (projected.x / rect.width) * 100, top: (projected.y / rect.height) * 100 };
}

function pinFromHref(href: string): [number, number] | null {
  const pin = parseUrl(href).q.pin;
  if (!pin) return null;
  const [lat, lng] = pin.split(',').map(Number);
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

export function useMapPopup({ mapRef, plot, isMapReady, href }: UseMapPopupArgs): MapPopupState {
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const isPinRestoredRef = useRef(false);

  const onShowPoint = useCallback((point: MapPoint) => {
    const { left, top } = projectedPercent(mapRef, point.lng, point.lat);
    setPopup({
      head: point.popHead, text: point.popText, meta: point.popMeta, url: point.url, isNew: point._new,
      lng: point.lng, lat: point.lat, left, top,
    });
  }, [mapRef]);

  const onCanvasClick = useCallback((info: { lng: number; lat: number }) => {
    if (!plot) return;
    const point = nearestMapPoint(info.lat, info.lng, plot.mapPoints);
    if (point) onShowPoint(point);
  }, [plot, onShowPoint]);

  useEffect(() => {
    if (isPinRestoredRef.current || !isMapReady || !plot) return;
    isPinRestoredRef.current = true;
    const pin = pinFromHref(href);
    if (!pin) return;
    const point = nearestMapPoint(pin[0], pin[1], plot.mapPoints);
    if (point) onShowPoint(point);
  }, [isMapReady, plot, href, onShowPoint]);

  const onClosePopup = useCallback(() => setPopup(null), []);
  const onCopyPopup = useCallback(() => {
    if (popup) copyToClipboard(`${popup.lng.toFixed(4)},${popup.lat.toFixed(4)}`);
  }, [popup]);

  return useMemo(
    () => ({ popup, onShowPoint, onCanvasClick, onClosePopup, onCopyPopup }),
    [popup, onShowPoint, onCanvasClick, onClosePopup, onCopyPopup],
  );
}
