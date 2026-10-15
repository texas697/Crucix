import { Suspense, lazy } from 'react';
import type { Theme } from '../../../../shared/theme';
import { AreaBrief } from '../../../map/AreaBrief';
import { MapFrame } from '../../../map/components/MapFrame';
import { LAYER_INFO } from '../../../map/layerDefs';
import { LayerInfoOverlay, MapLegend } from '../../../map/MapLegend';
import { MapPopup } from '../../../map/MapPopup';
import { RegionBar } from '../../../map/RegionBar';
import { SelectionPanel } from '../../../map/SelectionPanel';
import type { DashboardMapState } from '../../stateTypes';
import { MapControls } from '../MapControls';
import { MapLoading } from '../MapLoading';

const MapView = lazy(() => import('../../../map/MapView').then((m) => ({ default: m.MapView })));

export interface MapStageProps {
  map: DashboardMapState;
  theme: Theme;
  sourcesOk: number;
  sourcesQueried: number;
  markers: number;
  newsCount: number;
  onOpenGuide: () => void;
}

const PAN_HINT = 'Scroll to zoom · drag to pan';
const DRAW_HINT = 'Draw mode — the markers inside your shape become the selection';

export function MapStage({ map, theme, sourcesOk, sourcesQueried, markers, newsCount, onOpenGuide }: MapStageProps) {
  const { plot, region, layers, selection, popup } = map;
  if (!plot) return null;
  const bar = (
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
  );
  return (
    <MapFrame bar={bar}>
      <Suspense fallback={<MapLoading />}>
        <MapView
          ref={map.mapRef}
          theme={theme}
          points={plot.points}
          labels={map.mapLabels}
          rings={plot.rings}
          trails={plot.trails}
          spaceTrack={map.spaceTrack}
          region={region.region}
          selected={selection.selectedFC}
          drawTool={selection.drawTool}
          onDrawComplete={selection.onDrawComplete}
          onDrawCancel={selection.onDrawCancel}
          onCanvasClick={popup.onCanvasClick}
          onReady={map.ready.onMapReady}
        />
      </Suspense>
      <MapControls
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
        brief={<AreaBrief state={selection.brief} />}
        hasBrief={selection.brief.status !== 'idle'}
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
    </MapFrame>
  );
}
