import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asArr, asRec, num } from '../../coerce';
import { makeLabel } from '../../label';
import type { PanelDataProps, TrackItem } from '../../types';
import { Panel } from '../Panel';
import { STYLES, metricFill } from './styles';

interface CoreRow {
  l: string;
  v: number;
  p: number;
}

function MetricBar({ row }: { row: CoreRow }) {
  const fillSx = useMemo(() => metricFill(row.p), [row.p]);
  return (
    <Box className={CLASSES.metric} sx={STYLES.metric}>
      <Box className={CLASSES.metricTop} sx={STYLES.metricTop}>
        <Box component="span" className={CLASSES.metricLabel} sx={STYLES.metricLabel}>{row.l}</Box>
        <Box component="span" className={CLASSES.metricValue} sx={STYLES.metricValue}>{row.v}</Box>
      </Box>
      <Box className={CLASSES.metricBar} sx={STYLES.metricBar}>
        <Box component="span" className={CLASSES.metricBarFill} sx={fillSx} />
      </Box>
    </Box>
  );
}

export interface SignalCoreProps extends PanelDataProps {
  tracks?: TrackItem[] | null;
}

export function SignalCore({ data, t, tracks }: SignalCoreProps) {
  const tr = makeLabel(t);
  const coreRows: CoreRow[] = [
    { l: 'Live tracks', v: tracks?.length ?? 0, p: 70 },
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
