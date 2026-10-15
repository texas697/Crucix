import { useMemo, type ReactNode, type RefObject } from 'react';
import Box from '@mui/material/Box';
import { Map as MapGL, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre';
import type { Theme } from '../../../../shared/theme';
import { basemapForTheme } from '../../basemaps';
import { CLASSES } from '../../classes';
import { MAP_INIT_VIEW, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '../../consts';
import { useMapWorker } from '../../hooks/useMapWorker';
import type { DrawTool } from '../../selection';
import { MAP_FILL, STYLES } from '../../styles';
import { swallowMapError } from '../../utils';

export interface MapCanvasProps {
  mapRef: RefObject<MapRef | null>;
  theme: Theme;
  drawTool: DrawTool | null;
  onLoad: () => void;
  onClick: (event: MapLayerMouseEvent) => void;
  onDblClick: (event: MapLayerMouseEvent) => void;
  onMouseDown: (event: MapLayerMouseEvent) => void;
  onMouseMove: (event: MapLayerMouseEvent) => void;
  onMouseUp: (event: MapLayerMouseEvent) => void;
  onZoomEnd: () => void;
  children?: ReactNode;
}

export function MapCanvas({
  mapRef, theme, drawTool, onLoad, onClick, onDblClick, onMouseDown, onMouseMove, onMouseUp, onZoomEnd, children,
}: MapCanvasProps) {
  useMapWorker();
  const mapStyle = useMemo(() => basemapForTheme(theme), [theme]);
  return (
    <Box className={CLASSES.canvas} sx={STYLES.canvas}>
      <MapGL
        ref={mapRef}
        id="map"
        mapStyle={mapStyle}
        initialViewState={MAP_INIT_VIEW}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        renderWorldCopies
        attributionControl={false}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        dragPan={drawTool === null}
        cursor={drawTool ? 'crosshair' : 'grab'}
        style={MAP_FILL}
        onLoad={onLoad}
        onClick={onClick}
        onDblClick={onDblClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onZoomEnd={onZoomEnd}
        onError={swallowMapError}
      >
        {children}
      </MapGL>
    </Box>
  );
}
