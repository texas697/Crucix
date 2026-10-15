import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { MapLibreStyles } from '../MapLibreStyles';

export interface MapFrameProps {
  bar: ReactNode;
  children: ReactNode;
}

export function MapFrame({ bar, children }: MapFrameProps) {
  return (
    <Box className={CLASSES.wrap} sx={STYLES.wrap}>
      <MapLibreStyles />
      {bar}
      <Box className={CLASSES.container} id="mapContainer" sx={STYLES.container}>
        {children}
      </Box>
    </Box>
  );
}
