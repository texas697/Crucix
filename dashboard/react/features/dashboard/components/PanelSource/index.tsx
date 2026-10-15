import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { CLASSES } from '../../classes';
import { withSx } from '../../sx';
import { STYLES } from './styles';

export interface PanelSourceProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function PanelSource({ children, sx }: PanelSourceProps) {
  return (
    <Box className={CLASSES.panelSource} sx={withSx(STYLES.panelSource, sx)}>
      {children}
    </Box>
  );
}
