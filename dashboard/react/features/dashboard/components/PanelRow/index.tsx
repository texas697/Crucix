import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import clsx from 'clsx';
import { CLASSES, ROW_CLASSES } from '../../classes';
import { withSx } from '../../sx';
import type { RowName } from '../../types';
import { ROW_CARD_STYLES, STYLES } from './styles';

export interface PanelRowProps {
  name: RowName;
  children: ReactNode;
}

export function PanelRow({ name, children }: PanelRowProps) {
  return (
    <Box className={clsx(CLASSES.row, ROW_CLASSES[name])} sx={withSx(STYLES.row, ROW_CARD_STYLES[name])}>
      {children}
    </Box>
  );
}
