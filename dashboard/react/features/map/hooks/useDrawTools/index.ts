import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { Shape } from '../../../../state/url';
import { EMPTY_FC, MIN_CIRCLE_KM, MIN_RECT_DEG } from '../../consts';
import {
  circleFeature, emptyDrawState, featureToShape, haversineKm, polyFeature, rectFeature,
  type DrawFeature, type DrawTool, type LngLat,
} from '../../selection';
import type { MapFeatureCollection } from '../../types';

export interface UseDrawToolsArgs {
  drawTool: DrawTool | null;
  onDrawComplete?: (shape: Shape) => void;
  onDrawCancel?: () => void;
}

export interface DrawToolsState {
  preview: MapFeatureCollection;
  onClick: (event: MapLayerMouseEvent) => boolean;
  onDblClick: () => void;
  onMouseDown: (event: MapLayerMouseEvent) => void;
  onMouseMove: (event: MapLayerMouseEvent) => void;
  onMouseUp: (event: MapLayerMouseEvent) => void;
}

const toLngLat = (event: MapLayerMouseEvent): LngLat => ({ lat: event.lngLat.lat, lng: event.lngLat.lng });

export function useDrawTools({ drawTool, onDrawComplete, onDrawCancel }: UseDrawToolsArgs): DrawToolsState {
  const stateRef = useRef(emptyDrawState());
  const argsRef = useRef({ drawTool, onDrawComplete, onDrawCancel });
  const [feature, setFeature] = useState<DrawFeature | null>(null);

  useEffect(() => {
    argsRef.current = { drawTool, onDrawComplete, onDrawCancel };
  }, [drawTool, onDrawComplete, onDrawCancel]);

  useEffect(() => {
    stateRef.current = { ...stateRef.current, tool: drawTool, isDrawing: false, start: null, poly: [] };
    if (!drawTool) {
      stateRef.current.feature = null;
      setFeature(null);
    }
  }, [drawTool]);

  const complete = useCallback((finished: DrawFeature) => {
    stateRef.current = { ...stateRef.current, feature: finished, poly: [], start: null };
    setFeature(finished);
    argsRef.current.onDrawComplete?.(featureToShape(finished));
  }, []);

  const onClick = useCallback((event: MapLayerMouseEvent): boolean => {
    const tool = argsRef.current.drawTool;
    if (tool === 'poly') {
      const state = stateRef.current;
      state.poly.push([event.lngLat.lng, event.lngLat.lat]);
      state.feature = polyFeature(state.poly);
      setFeature(state.feature);
      return true;
    }
    return tool !== null;
  }, []);

  const onDblClick = useCallback(() => {
    const state = stateRef.current;
    if (argsRef.current.drawTool === 'poly' && state.poly.length >= 3) complete(polyFeature(state.poly));
  }, [complete]);

  const onMouseDown = useCallback((event: MapLayerMouseEvent) => {
    const tool = argsRef.current.drawTool;
    if (!tool || tool === 'poly') return;
    stateRef.current.isDrawing = true;
    stateRef.current.start = toLngLat(event);
  }, []);

  const onMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const state = stateRef.current;
    if (!state.isDrawing || !state.start) return;
    const tool = argsRef.current.drawTool;
    const end = toLngLat(event);
    if (tool === 'circle') state.feature = circleFeature(state.start, haversineKm(state.start, end));
    else if (tool === 'rect') state.feature = rectFeature(state.start, end);
    setFeature(state.feature);
  }, []);

  const onMouseUp = useCallback((event: MapLayerMouseEvent) => {
    const state = stateRef.current;
    if (!state.isDrawing) return;
    state.isDrawing = false;
    const start = state.start;
    const end = toLngLat(event);
    const tool = argsRef.current.drawTool;
    let finished: DrawFeature | null = null;
    if (start && tool === 'circle') {
      const radiusKm = haversineKm(start, end);
      if (radiusKm > MIN_CIRCLE_KM) finished = circleFeature(start, radiusKm);
    } else if (start && tool === 'rect') {
      if (Math.abs(end.lat - start.lat) > MIN_RECT_DEG || Math.abs(end.lng - start.lng) > MIN_RECT_DEG) finished = rectFeature(start, end);
    }
    state.start = null;
    if (finished) {
      complete(finished);
      return;
    }
    state.feature = null;
    setFeature(null);
    argsRef.current.onDrawCancel?.();
  }, [complete]);

  const preview = useMemo<MapFeatureCollection>(
    () => (feature ? { type: 'FeatureCollection', features: [feature] } : EMPTY_FC),
    [feature],
  );

  return useMemo(
    () => ({ preview, onClick, onDblClick, onMouseDown, onMouseMove, onMouseUp }),
    [preview, onClick, onDblClick, onMouseDown, onMouseMove, onMouseUp],
  );
}
