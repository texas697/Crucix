import Box from '@mui/material/Box';
import clsx from 'clsx';
import { CLASSES, LAYER_DOT_CLASSES } from '../../classes';
import { makeLabel } from '../../label';
import { withSx } from '../../sx';
import type { PanelDataProps } from '../../types';
import { Panel } from '../Panel';
import { sensorLayers } from './layers';
import { LAYER_DOT_STYLES, STYLES } from './styles';

export function SensorGrid({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const layers = sensorLayers(data, tr);
  return (
    <Panel id="pSensor" title={tr('panels.sensorGrid', 'Sensor grid')} badge={`${layers.length} feeds`} isPadSm flex="1 1 260px">
      {layers.map((l, i) => (
        <Box className={CLASSES.layerItem} sx={STYLES.layerItem} key={`${l.name}-${i}`}>
          <Box className={CLASSES.layerLeft} sx={STYLES.layerLeft}>
            <Box className={clsx(CLASSES.layerDot, LAYER_DOT_CLASSES[l.dot])} sx={withSx(STYLES.layerDot, LAYER_DOT_STYLES[l.dot])} />
            <Box className={CLASSES.layerText}>
              <Box className={CLASSES.layerName} sx={STYLES.layerName}>{l.name}</Box>
              <Box className={CLASSES.layerSub} sx={STYLES.layerSub}>{l.sub}</Box>
            </Box>
          </Box>
          <Box className={CLASSES.layerCount} sx={STYLES.layerCount}>{l.count}</Box>
        </Box>
      ))}
    </Panel>
  );
}
