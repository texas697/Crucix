import { useMemo } from 'react';
import { CLASSES } from '../../classes';
import type { MacroMetric } from '../MarketsPanel/metrics';
import { SparkSvg } from '../SparkSvg';

export interface MacroCardProps {
  metric: MacroMetric;
}

export function MacroCard({ metric: m }: MacroCardProps) {
  const fill = useMemo(() => ({ width: `${m.p}%` }), [m.p]);
  return (
    <div className={CLASSES.macroCard}>
      <div className={CLASSES.macroLabel}>{m.l}</div>
      <span className={CLASSES.macroValue}>
        {m.v}
        {m.spark ? <SparkSvg values={m.spark} isGood={!!m.sparkUp} /> : null}
      </span>
      <span className={CLASSES.macroSub}>{m.s}</span>
      <div className={CLASSES.macroBar}>
        <span className={CLASSES.macroBarFill} style={fill} />
      </div>
    </div>
  );
}
