import { useCallback, useMemo, useState } from 'react';
import { LAYER_DEFS, type TimeWindow } from '../../../features/map/layerDefs';
import type { SnapshotLayersState } from '../../types';

function layersVisible(isOn: boolean): Record<string, boolean> {
  return Object.fromEntries(LAYER_DEFS.map((l) => [l.key, isOn]));
}

export function useSnapshotLayers(): SnapshotLayersState {
  const [layerVisible, setLayerVisible] = useState<Record<string, boolean>>(() => layersVisible(true));
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
  const [layerInfoKey, setLayerInfoKey] = useState<string | null>(null);

  const onToggleLayer = useCallback((key: string) => {
    setLayerVisible((v) => ({ ...v, [key]: !v[key] }));
  }, []);

  const onSetAllLayers = useCallback((isOn: boolean) => {
    setLayerVisible(layersVisible(isOn));
  }, []);

  const onCloseLayerInfo = useCallback(() => setLayerInfoKey(null), []);

  return useMemo(() => ({
    layerVisible, timeWindow, layerInfoKey, setTimeWindow, setLayerInfoKey, onToggleLayer, onSetAllLayers, onCloseLayerInfo,
  }), [layerVisible, timeWindow, layerInfoKey, onToggleLayer, onSetAllLayers, onCloseLayerInfo]);
}
