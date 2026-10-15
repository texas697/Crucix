import { makeLabel } from '../../label';
import type { PanelDataProps } from '../../types';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';
import { ThreatRow } from '../ThreatRow';
import { gdeltHours, threatByRegion } from './threat';

export function ThreatPanel({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const rows = threatByRegion(data);
  return (
    <Panel id="pThreat" title={tr('panels.regionalThreat', 'Regional threat')} badge="All theaters" flex="1 1 260px">
      {rows.map((x) => <ThreatRow key={x.r} threat={x} />)}
      <PanelSource>
        GDELT severe conflict events (last {gdeltHours(data)}h, log-scaled) plus disrupted chokepoints, national
        internet outages, GDACS red alerts, radiation anomalies and WHO very-high outbreaks {'·'} hover
        for the breakdown
      </PanelSource>
    </Panel>
  );
}
