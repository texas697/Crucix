import { makeLabel } from '../../label';
import { TONE_STYLES } from '../../styles';
import type { PanelDataProps } from '../../types';
import { EconRow } from '../EconRow';
import { Panel } from '../Panel';
import { riskGaugeView } from './metrics';

export function RiskGauges({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const { badge, metrics } = riskGaugeView(data, tr);
  return (
    <Panel id="pRisk" title={tr('panels.riskGauges', 'Risk gauges')} badge={badge} flex="1 1 240px">
      {metrics.map((m) => (
        <EconRow key={m.key} label={m.label} value={m.value} title={m.title} valueSx={m.tone ? TONE_STYLES[m.tone] : undefined} />
      ))}
    </Panel>
  );
}
