import { useMemo } from 'react';
import { CLASSES } from '../../classes';
import { asArr, asRec, num } from '../../coerce';
import { makeLabel } from '../../label';
import type { PanelDataProps } from '../../types';
import { Panel } from '../Panel';

interface CoreRow {
  l: string;
  v: number;
  p: number;
}

function MetricBar({ row }: { row: CoreRow }) {
  const fill = useMemo(() => ({ width: `${row.p}%` }), [row.p]);
  return (
    <div className={CLASSES.metric}>
      <div className={CLASSES.metricTop}>
        <span className={CLASSES.metricLabel}>{row.l}</span>
        <span className={CLASSES.metricValue}>{row.v}</span>
      </div>
      <div className={CLASSES.metricBar}>
        <span className={CLASSES.metricBarFill} style={fill} />
      </div>
    </div>
  );
}

export function SignalCore({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const coreRows: CoreRow[] = [
    { l: 'Live tracks', v: 0, p: 70 },
    { l: 'Air theaters', v: asArr(data.air).length, p: 60 },
    { l: 'Thermal spikes', v: asArr(data.thermal).reduce((s, r) => s + num(r.hc), 0), p: 80 },
    { l: 'SDR nodes', v: num(asRec(data.sdr).total), p: 92 },
    { l: 'Chokepoints', v: asArr(data.chokepoints).length, p: 50 },
    { l: 'Outbreaks', v: asArr(asRec(data.healthWatch).outbreaks).length, p: 40 },
  ];
  return (
    <Panel id="pCore" title={tr('panels.signalCore', 'Signal core')} badge="Hot metrics" flex="1 1 240px">
      {coreRows.map((c) => <MetricBar key={c.l} row={c} />)}
    </Panel>
  );
}
