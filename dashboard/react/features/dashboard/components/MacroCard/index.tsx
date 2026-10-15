import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { CLASSES } from '../../classes';
import type { MacroMetric } from '../MarketsPanel/metrics';
import { SparkSvg } from '../SparkSvg';
import { STYLES, macroFillSx } from './styles';

export interface MacroCardProps {
  metric: MacroMetric;
}

export function MacroCard({ metric: m }: MacroCardProps) {
  const fillSx = useMemo(() => macroFillSx(m.p), [m.p]);
  return (
    <Paper className={CLASSES.macroCard} sx={STYLES.macroCard}>
      <Box className={CLASSES.macroLabel} sx={STYLES.macroLabel}>{m.l}</Box>
      <Box component="span" className={CLASSES.macroValue} sx={STYLES.macroValue}>
        {m.v}
        {m.spark ? <SparkSvg values={m.spark} isGood={!!m.sparkUp} /> : null}
      </Box>
      <Box component="span" className={CLASSES.macroSub} sx={STYLES.macroSub}>{m.s}</Box>
      <Box className={CLASSES.macroBar} sx={STYLES.macroBar}>
        <Box component="span" className={CLASSES.macroBarFill} sx={fillSx} />
      </Box>
    </Paper>
  );
}
