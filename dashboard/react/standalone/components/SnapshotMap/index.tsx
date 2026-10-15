import { Suspense, lazy } from 'react';
import Box from '@mui/material/Box';
import type { Theme } from '../../../shared/theme';
import { RegionBar } from '../../../features/map/RegionBar';
import { MapLegend, LayerInfoOverlay } from '../../../features/map/MapLegend';
import { LAYER_INFO } from '../../../features/map/layerDefs';
import { MapPopup } from '../../../features/map/MapPopup';
import { SelectionPanel } from '../../../features/map/SelectionPanel';
import { AreaBrief, EMPTY_AREA_BRIEF } from '../../../features/map/AreaBrief';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { SnapshotMapState } from '../../types';
import { SnapshotMapControls } from '../SnapshotMapControls';
import { SnapshotMapLoading } from '../SnapshotMapLoading';

const MapView = lazy(() => import('../../../features/map/MapView').then((m) => ({ default: m.MapView })));

export interface SnapshotMapProps {
  map: SnapshotMapState;
  theme: Theme;
  sourcesOk: number;
  sourcesQueried: number;
  markers: number;
  newsCount: number;
  onOpenGuide: () => void;
}

const PAN_HINT = 'Standalone snapshot · scroll to zoom · drag to pan';
const DRAW_HINT = 'Draw mode — the markers inside your shape become the selection';

export function SnapshotMap({ map, theme, sourcesOk, sourcesQueried, markers, newsCount, onOpenGuide }: SnapshotMapProps) {
  const { plot, region, layers, selection, popup } = map;
  if (!plot) return null;
  return (
    <Box className={CLASSES.mapWrap} sx={STYLES.mapWrap}>
      <RegionBar
        region={region.region}
        sourcesOk={sourcesOk}
        sourcesQueried={sourcesQueried}
        markers={markers}
        news={newsCount}
        onRegion={region.setRegion}
        onSearch={map.onSearch}
        hint={selection.drawTool ? DRAW_HINT : PAN_HINT}
      />
      <Box className={CLASSES.mapContainer} sx={STYLES.mapContainer} id="mapContainer">
        <Suspense fallback={<SnapshotMapLoading />}>
          <MapView
            ref={map.mapRef}
            theme={theme}
            points={plot.points}
            labels={map.mapLabels}
            rings={plot.rings}
            trails={plot.trails}
            region={region.region}
            selected={selection.selectedFC}
            drawTool={selection.drawTool}
            onDrawComplete={selection.onDrawComplete}
            onDrawCancel={selection.onDrawCancel}
            onCanvasClick={popup.onCanvasClick}
          />
        </Suspense>
        <SnapshotMapControls
          drawTool={selection.drawTool}
          onSetDrawTool={selection.setDrawTool}
          onClearSelection={selection.onClearSelection}
          onOpenGuide={onOpenGuide}
        />
        {popup.popup && (
          <MapPopup
            head={popup.popup.head}
            text={popup.popup.text}
            meta={popup.popup.meta}
            url={popup.popup.url}
            isNew={popup.popup.isNew}
            lng={popup.popup.lng}
            lat={popup.popup.lat}
            left={popup.popup.left}
            top={popup.popup.top}
            onClose={popup.onClosePopup}
            onCopy={popup.onCopyPopup}
          />
        )}
        <SelectionPanel
          items={selection.selected}
          onFocus={selection.onFocusSelection}
          onClear={selection.onClearSelection}
          brief={<AreaBrief state={EMPTY_AREA_BRIEF} />}
          hasBrief={false}
        />
        <MapLegend
          region={region.region}
          layerCounts={plot.layerCounts}
          visible={layers.layerVisible}
          timeWindow={layers.timeWindow}
          onToggleLayer={layers.onToggleLayer}
          onSetAll={layers.onSetAllLayers}
          onSetTimeWindow={layers.setTimeWindow}
          onClearRegion={region.onClearRegion}
          onInfo={layers.setLayerInfoKey}
        />
        <LayerInfoOverlay
          layerKey={layers.layerInfoKey}
          info={layers.layerInfoKey ? LAYER_INFO[layers.layerInfoKey] ?? null : null}
          onClose={layers.onCloseLayerInfo}
        />
      </Box>
    </Box>
  );
}
