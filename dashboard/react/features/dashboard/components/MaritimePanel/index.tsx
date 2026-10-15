import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asArr, asRec, num, str } from '../../coerce';
import type { Label } from '../../label';
import { TONE_STYLES } from '../../styles';
import type { PanelDataProps } from '../../types';
import { ChokepointRow } from '../ChokepointRow';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';
import { StatusBanner } from '../StatusBanner';
import { STYLES } from './styles';

export interface MaritimePanelProps extends Pick<PanelDataProps, 'data'> {
  tr: Label;
}

const ORD: Record<string, number> = { disrupted: 0, reduced: 1, watch: 2, elevated: 3, normal: 4 };

export function MaritimePanel({ data, tr }: MaritimePanelProps) {
  const chokepoints = asArr(data.chokepoints);
  const maritimeMeta = asRec(data.maritimeMeta);
  const hasSummary = !!maritimeMeta.summary;
  const summary = asRec(maritimeMeta.summary);
  const rows = chokepoints
    .filter((c) => c.major || c.status === 'disrupted')
    .sort((a, b) => (ORD[str(a.status)] ?? 5) - (ORD[str(b.status)] ?? 5) || num(a.pct) - num(b.pct));
  const liveN = num(asRec(data.shipsMeta).liveVessels);
  const disrupted = hasSummary ? num(summary.disrupted) : 0;
  const signals = Array.isArray(maritimeMeta.signals) ? (maritimeMeta.signals as unknown[]).map(str) : [];
  const ongoingSignal = signals.find((x) => /DISRUPTED/.test(x));
  const disruptedText = ongoingSignal ? ongoingSignal.replace(/^CHOKEPOINT DISRUPTED: /, '').split(' — ')[0] : '';
  const badge = hasSummary ? (
    <>
      {disrupted} disrupted
      {liveN ? <> {'·'} <Box component="span" className={CLASSES.maritimeShips} sx={TONE_STYLES.sky}>{liveN} ships live</Box></> : null}
      {maritimeMeta.asOf ? <> {'·'} to {str(maritimeMeta.asOf).slice(5).replace('-', '/')}</> : null}
    </>
  ) : undefined;

  return (
    <Panel id="pMaritime" title={tr('panels.maritimeWatch', 'Maritime watch')} badge={badge} flex="1 1 280px">
      <StatusBanner tone={hasSummary && disrupted ? 'anom' : 'ok'} sx={STYLES.bannerSpaced} note={<>ships/day {'·'} vs 1-yr</>}>
        {hasSummary ? (disrupted ? <>{'⚠'} {disruptedText}</> : <>{'●'} All chokepoints near normal</>) : 'IMF PortWatch'}
      </StatusBanner>
      {rows.length
        ? rows.map((c, i) => <ChokepointRow key={`${str(c.id)}-${i}`} chokepoint={c} />)
        : <PanelSource>{str(maritimeMeta.error) || 'No chokepoint data'}</PanelSource>}
    </Panel>
  );
}
