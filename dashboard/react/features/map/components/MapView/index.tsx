import { forwardRef, useCallback } from 'react';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { EMPTY_FC } from '../../consts';
import { useCanvasClick } from '../../hooks/useCanvasClick';
import { useDrawTools } from '../../hooks/useDrawTools';
import { useMapHandle } from '../../hooks/useMapHandle';
import { useMapInstance } from '../../hooks/useMapInstance';
import { usePlaneIcon } from '../../hooks/usePlaneIcon';
import { useZoomedIn } from '../../hooks/useZoomedIn';
import type { MapViewHandle, MapViewProps } from '../../types';
import { MapCanvas } from '../MapCanvas';
import { MapLabels } from '../MapLabels';
import { MapLayers } from '../MapLayers';

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(props, ref) {
  const {
    theme, points, labels, rings, trails, spaceTrack, selected, drawTool = null,
    onDrawComplete, onDrawCancel, onReady, onCanvasClick,
  } = props;
  const instance = useMapInstance({ onReady });
  useMapHandle({ ref, getMap: instance.getMap });
  usePlaneIcon({ getMap: instance.getMap, isLoaded: instance.isLoaded });
  const zoom = useZoomedIn({ getMap: instance.getMap, isLoaded: instance.isLoaded });
  const draw = useDrawTools({ drawTool, onDrawComplete, onDrawCancel });
  const onPlainClick = useCanvasClick({ getMap: instance.getMap, points, onCanvasClick });

  const onClick = useCallback((event: MapLayerMouseEvent) => {
    if (!draw.onClick(event)) onPlainClick(event);
  }, [draw, onPlainClick]);

  return (
    <MapCanvas
      mapRef={instance.mapRef}
      theme={theme}
      drawTool={drawTool}
      onLoad={instance.onLoad}
      onClick={onClick}
      onDblClick={draw.onDblClick}
      onMouseDown={draw.onMouseDown}
      onMouseMove={draw.onMouseMove}
      onMouseUp={draw.onMouseUp}
      onZoomEnd={zoom.onZoomEnd}
    >
      <MapLayers
        points={points}
        rings={rings}
        trails={trails}
        spaceTrack={spaceTrack ?? EMPTY_FC}
        selected={selected ?? EMPTY_FC}
        draw={draw.preview}
      />
      <MapLabels labels={labels} isZoomedIn={zoom.isZoomedIn} />
    </MapCanvas>
  );
});
