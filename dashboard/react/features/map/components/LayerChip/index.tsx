import { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import type { LayerDef } from '../../layerDefs';
import { STYLES } from '../../styles';
import { legendDotSx } from '../../stylesLegend';

export interface LayerChipProps {
  def: LayerDef;
  count: number;
  isOn: boolean;
  onToggle: (key: string) => void;
  onInfo: (key: string) => void;
}

export function LayerChip({ def, count, isOn, onToggle, onInfo }: LayerChipProps) {
  const onClick = useCallback(() => onToggle(def.key), [onToggle, def.key]);
  const onInfoClick = useCallback(() => onInfo(def.key), [onInfo, def.key]);
  const dotSx = useMemo(() => legendDotSx(def.color, isOn), [def.color, isOn]);

  return (
    <Chip
      className={clsx(CLASSES.legendChip, !isOn && CLASSES.legendChipOff)}
      sx={STYLES.legendChip}
      data-layer={def.key}
      title={`${isOn ? 'Hide' : 'Show'} ${def.label}`}
      onClick={onClick}
      icon={<Box component="span" className={CLASSES.legendDot} sx={dotSx} />}
      label={(
        <>
          {def.label}
          <Box component="span" className={CLASSES.legendCount} sx={STYLES.legendCount}>{count}</Box>
        </>
      )}
      deleteIcon={(
        <Box
          component="span"
          className={CLASSES.legendInfo}
          sx={STYLES.legendInfo}
          role="button"
          title="About this layer"
          aria-label={`About ${def.label}`}
        >
          i
        </Box>
      )}
      onDelete={onInfoClick}
    />
  );
}
