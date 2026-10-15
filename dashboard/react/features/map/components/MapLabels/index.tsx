import Box from '@mui/material/Box';
import clsx from 'clsx';
import { Marker } from 'react-map-gl/maplibre';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { MapLabel } from '../../types';

export interface MapLabelsProps {
  labels: MapLabel[];
  isZoomedIn: boolean;
}

export function MapLabels({ labels, isZoomedIn }: MapLabelsProps) {
  return (
    <>
      {labels.map((label, index) => (
        <Marker key={`${index}:${label.text}`} longitude={label.anchor[0]} latitude={label.anchor[1]} anchor="left">
          <Box
            className={clsx(CLASSES.label, label.region && CLASSES.labelAgg, isZoomedIn && CLASSES.labelZoomed)}
            sx={[STYLES.label, !!label.region && STYLES.labelAgg]}
          >
            {label.text}
          </Box>
        </Marker>
      ))}
    </>
  );
}
