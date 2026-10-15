import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { CLASSES } from '../../classes';
import { withSx } from '../../sx';
import { DOT_STYLES, STYLES, type DeltaKind } from './styles';

export interface DeltaRowProps {
  kind: DeltaKind;
  label: ReactNode;
  labelSx?: SxProps<Theme>;
  value?: ReactNode;
}

export function DeltaRow({ kind, label, labelSx, value }: DeltaRowProps) {
  return (
    <Box className={CLASSES.deltaRow} sx={STYLES.deltaRow}>
      <Box component="span" className={CLASSES.deltaDot} sx={withSx(STYLES.deltaDot, DOT_STYLES[kind])} />
      <Box component="span" className={CLASSES.deltaLabel} sx={withSx(STYLES.deltaLabel, labelSx)}>{label}</Box>
      {value !== undefined ? <Box component="span" className={CLASSES.deltaValue} sx={STYLES.deltaValue}>{value}</Box> : null}
    </Box>
  );
}
