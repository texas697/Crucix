import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { HealthResponse, SweepData, SweepMeta } from '../api/types';
import type { TickerItem } from '../features/dashboard/types';
import type { TimeWindow } from '../features/map/layerDefs';
import type { MapLabel, MapViewHandle } from '../features/map/MapView';
import type { MapPoint, PlotResult } from '../features/map/plot';
import type { RegionKey } from '../features/map/regions';
import type { DrawTool } from '../features/map/selection';
import type { createTranslator } from '../shared/locale';
import type { Shape } from '../state/url';

export interface SnapshotAppProps {
  snapshot: SweepData | null;
  now?: () => number;
}

export interface PopupInfo {
  head?: string;
  text?: string;
  meta?: string;
  url?: string;
  isNew?: boolean;
  lng: number;
  lat: number;
  left: number;
  top: number;
}

export interface SnapshotRegionState {
  region: RegionKey;
  setRegion: (region: RegionKey) => void;
  onSearchRegion: (query: string) => void;
  onClearRegion: () => void;
}

export interface SnapshotLayersState {
  layerVisible: Record<string, boolean>;
  timeWindow: TimeWindow;
  layerInfoKey: string | null;
  setTimeWindow: Dispatch<SetStateAction<TimeWindow>>;
  setLayerInfoKey: Dispatch<SetStateAction<string | null>>;
  onToggleLayer: (key: string) => void;
  onSetAllLayers: (isOn: boolean) => void;
  onCloseLayerInfo: () => void;
}

export interface SnapshotSelectionState {
  drawTool: DrawTool | null;
  selected: MapPoint[];
  selectedFC: GeoJSON.FeatureCollection;
  setDrawTool: Dispatch<SetStateAction<DrawTool | null>>;
  onClearSelection: () => void;
  onDrawComplete: (shape: Shape) => void;
  onDrawCancel: () => void;
  onFocusSelection: (index: number) => void;
}

export interface SnapshotPopupState {
  popup: PopupInfo | null;
  onCanvasClick: (info: { lng: number; lat: number }) => void;
  onClosePopup: () => void;
  onCopyPopup: () => void;
}

export interface SnapshotMapState {
  mapRef: RefObject<MapViewHandle | null>;
  plot: PlotResult | null;
  mapLabels: MapLabel[];
  region: SnapshotRegionState;
  layers: SnapshotLayersState;
  selection: SnapshotSelectionState;
  popup: SnapshotPopupState;
}

export interface SnapshotView {
  t?: ReturnType<typeof createTranslator>;
  tickerItems: TickerItem[];
  meta: SweepMeta | null;
  health: HealthResponse | null;
  viewData: SweepData | null;
}

export interface SignalGuideState {
  isGuideOpen: boolean;
  onOpenGuide: () => void;
  onCloseGuide: () => void;
}
