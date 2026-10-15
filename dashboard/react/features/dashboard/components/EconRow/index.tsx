import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { CLASSES } from '../../classes';
import { withSx } from '../../sx';
import { STYLES } from './styles';

export interface EconRowProps {
  label: ReactNode;
  value: ReactNode;
  title?: string;
  valueId?: string;
  valueSx?: SxProps<Theme>;
}

export function EconRow({ label, value, title, valueId, valueSx }: EconRowProps) {
  return (
    <Box className={CLASSES.econRow} sx={STYLES.econRow} title={title}>
      <Box component="span" className={CLASSES.econLabel} sx={STYLES.econLabel}>{label}</Box>
      <Box component="span" className={CLASSES.econValue} id={valueId} sx={withSx(STYLES.econValue, valueSx)}>
        {value}
      </Box>
    </Box>
  );
}
