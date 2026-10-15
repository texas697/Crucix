import clsx from 'clsx';
import { CLASSES, LAYER_DOT_CLASSES } from '../../classes';
import { makeLabel } from '../../label';
import type { PanelDataProps } from '../../types';
import { Panel } from '../Panel';
import { sensorLayers } from './layers';

export function SensorGrid({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const layers = sensorLayers(data, tr);
  return (
    <Panel id="pSensor" title={tr('panels.sensorGrid', 'Sensor grid')} badge={`${layers.length} feeds`} isPadSm flex="1 1 260px">
      {layers.map((l, i) => (
        <div className={CLASSES.layerItem} key={`${l.name}-${i}`}>
          <div className={CLASSES.layerLeft}>
            <div className={clsx(CLASSES.layerDot, LAYER_DOT_CLASSES[l.dot])} />
            <div className={CLASSES.layerText}>
              <div className={CLASSES.layerName}>{l.name}</div>
              <div className={CLASSES.layerSub}>{l.sub}</div>
            </div>
          </div>
          <div className={CLASSES.layerCount}>{l.count}</div>
        </div>
      ))}
    </Panel>
  );
}
