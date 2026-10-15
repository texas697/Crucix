import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { SweepData } from '../../api/types';
import type { AreaBriefState } from '../map/AreaBrief';
import type { TimeWindow } from '../map/layerDefs';
import type { MapLabel, MapViewHandle } from '../map/MapView';
import type { MapPoint, PlotResult } from '../map/plot';
import type { RegionKey } from '../map/regions';
import type { DrawTool } from '../map/selection';
import type { Shape } from '../../state/url';
import type { PopupInfo } from './types';

export interface DashboardRegionState {
  region: RegionKey;
  setRegion: (region: RegionKey) => void;
  onClearRegion: () => void;
}

export interface LayerControlsState {
  layerVisible: Record<string, boolean>;
  timeWindow: TimeWindow;
  layerInfoKey: string | null;
  setTimeWindow: Dispatch<SetStateAction<TimeWindow>>;
  setLayerInfoKey: Dispatch<SetStateAction<string | null>>;
  onToggleLayer: (key: string) => void;
  onSetAllLayers: (isOn: boolean) => void;
  onCloseLayerInfo: () => void;
}

export interface MarkerPlot {
  plot: PlotResult | null;
  mapLabels: MapLabel[];
}

export interface MapSelectionState {
  drawTool: DrawTool | null;
  selected: MapPoint[];
  selectedFC: GeoJSON.FeatureCollection;
  brief: AreaBriefState;
  setDrawTool: Dispatch<SetStateAction<DrawTool | null>>;
  onDrawComplete: (shape: Shape) => void;
  onDrawCancel: () => void;
  onClearSelection: () => void;
  onFocusSelection: (index: number) => void;
}

export interface MapPopupState {
  popup: PopupInfo | null;
  onShowPoint: (point: MapPoint) => void;
  onCanvasClick: (info: { lng: number; lat: number }) => void;
  onClosePopup: () => void;
  onCopyPopup: () => void;
}

export interface MapReadyState {
  isMapReady: boolean;
  onMapReady: () => void;
}

export interface GuideOverlayState {
  isGuideOpen: boolean;
  onOpenGuide: () => void;
  onCloseGuide: () => void;
}

export interface IdeasState {
  panelData: SweepData | null;
  onGenerateIdeas: () => void;
}

export interface DashboardMapState {
  mapRef: RefObject<MapViewHandle | null>;
  ready: MapReadyState;
  region: DashboardRegionState;
  layers: LayerControlsState;
  plot: PlotResult | null;
  mapLabels: MapLabel[];
  selection: MapSelectionState;
  popup: MapPopupState;
  spaceTrack: GeoJSON.FeatureCollection;
  onSearch: (query: string) => void;
}
