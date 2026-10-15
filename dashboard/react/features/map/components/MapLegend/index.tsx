import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { CLASSES } from '../../classes';
import { useLegendQuery } from '../../hooks/useLegendQuery';
import type { TimeWindow } from '../../layerDefs';
import type { RegionKey } from '../../regions';
import { STYLES } from '../../styles';
import { LayerChip } from '../LayerChip';
import { LegendControls } from '../LegendControls';

export interface MapLegendProps {
  region: RegionKey;
  layerCounts: Record<string, number | undefined>;
  visible: Record<string, boolean | undefined>;
  timeWindow: TimeWindow;
  onToggleLayer: (key: string) => void;
  onSetAll: (visible: boolean) => void;
  onSetTimeWindow: (window: TimeWindow) => void;
  onClearRegion: () => void;
  onInfo: (key: string) => void;
}

export function MapLegend({
  region, layerCounts, visible, timeWindow, onToggleLayer, onSetAll, onSetTimeWindow, onClearRegion, onInfo,
}: MapLegendProps) {
  const { query, chips, onQueryChange } = useLegendQuery({ layerCounts });

  return (
    <Paper className={CLASSES.legend} id="mapLegend" sx={STYLES.legend} elevation={0}>
      <LegendControls
        region={region}
        timeWindow={timeWindow}
        query={query}
        onQueryChange={onQueryChange}
        onSetAll={onSetAll}
        onSetTimeWindow={onSetTimeWindow}
        onClearRegion={onClearRegion}
      />
      <Box className={CLASSES.legendChips} sx={STYLES.legendChips}>
        {chips.map((def) => (
          <LayerChip
            key={def.key}
            def={def}
            count={layerCounts[def.key] || 0}
            isOn={!!visible[def.key]}
            onToggle={onToggleLayer}
            onInfo={onInfo}
          />
        ))}
      </Box>
    </Paper>
  );
}
