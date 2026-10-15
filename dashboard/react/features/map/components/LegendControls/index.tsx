import { useCallback, type ChangeEvent, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { TIME_WINDOW_LABELS, TIME_WINDOW_LIST, type TimeWindow } from '../../layerDefs';
import { REGION_LABEL, type RegionKey } from '../../regions';
import { STYLES } from '../../styles';

export interface LegendControlsProps {
  region: RegionKey;
  timeWindow: TimeWindow;
  query: string;
  onQueryChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSetAll: (visible: boolean) => void;
  onSetTimeWindow: (window: TimeWindow) => void;
  onClearRegion: () => void;
}

export function LegendControls({
  region, timeWindow, query, onQueryChange, onSetAll, onSetTimeWindow, onClearRegion,
}: LegendControlsProps) {
  const onAll = useCallback(() => onSetAll(true), [onSetAll]);
  const onNone = useCallback(() => onSetAll(false), [onSetAll]);
  const onTimeChange = useCallback((_event: MouseEvent<HTMLElement>, value: TimeWindow | null) => {
    if (value) onSetTimeWindow(value);
  }, [onSetTimeWindow]);

  return (
    <Box className={CLASSES.legendControls} sx={STYLES.legendControls}>
      {region !== 'world' && (
        <Button className={CLASSES.legendRegion} sx={STYLES.legendRegion} onClick={onClearRegion} title="Clear region filter">
          {REGION_LABEL[region]}
          <Box component="span" className={CLASSES.legendRegionClear} sx={STYLES.legendRegionClear}>&#10005;</Box>
        </Button>
      )}
      <Button className={CLASSES.legendAction} sx={STYLES.legendAction} onClick={onAll}>All</Button>
      <Button className={CLASSES.legendAction} sx={STYLES.legendAction} onClick={onNone}>None</Button>
      <ToggleButtonGroup
        className={CLASSES.legendTimes}
        sx={STYLES.legendTimes}
        exclusive
        value={timeWindow}
        onChange={onTimeChange}
        aria-label="Time window"
      >
        {TIME_WINDOW_LIST.map((window) => (
          <ToggleButton
            key={window}
            value={window}
            className={clsx(CLASSES.legendTime, timeWindow === window && CLASSES.legendTimeOn)}
            sx={STYLES.legendTime}
            disableRipple
          >
            {TIME_WINDOW_LABELS[window]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <InputBase
        className={CLASSES.legendSearch}
        id="legSearch"
        placeholder="Filter layers"
        autoComplete="off"
        value={query}
        onChange={onQueryChange}
        sx={STYLES.legendSearch}
        inputProps={{ 'aria-label': 'Filter layers' }}
      />
    </Box>
  );
}
