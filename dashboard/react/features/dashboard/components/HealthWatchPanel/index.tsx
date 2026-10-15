import type { ReactNode } from 'react';
import { CLASSES } from '../../classes';
import { asArr, asRec, asText, num } from '../../coerce';
import { relTime } from '../../format';
import { makeLabel } from '../../label';
import { STYLES } from '../../styles';
import type { PanelDataProps } from '../../types';
import { HealthBanner } from '../HealthBanner';
import { OutbreakRow } from '../OutbreakRow';
import { Panel } from '../Panel';
import { TravelRow } from '../TravelRow';
import { UsOutbreakRow } from '../UsOutbreakRow';
import { riskMax } from './health';

function section(label: string, rows: ReactNode[]): ReactNode {
  return rows.length ? <><div className={CLASSES.sectionHead}>{label}</div>{rows}</> : null;
}

export function HealthWatchPanel({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const hw = asRec(data.healthWatch);
  const outbreaks = asArr(hw.outbreaks);
  const allTravel = asArr(hw.travel);
  const travel = allTravel.filter((n) => num(n.level) >= 2);
  const us = asArr(hw.cdcOutbreaks);
  const error = asText(hw.error);
  const obRows = outbreaks.map((o, i) => <OutbreakRow key={`ob-${i}-${asText(o.disease)}`} outbreak={o} />);
  const trRows = travel.slice(0, 8).map((n, i) => <TravelRow key={`tr-${i}-${asText(n.name)}`} notice={n} />);
  const usRows = us.slice(0, 3).map((n, i) => <UsOutbreakRow key={`us-${i}-${asText(n.title)}`} investigation={n} />);
  const worst = outbreaks.find((o) => {
    const m = riskMax(o.risk).toLowerCase();
    return m === 'very high' || m === 'high';
  });
  const hasRows = obRows.length > 0 || trRows.length > 0 || usRows.length > 0;
  const l34 = allTravel.filter((n) => num(n.level) >= 3).length;
  const badge = (
    <>
      {outbreaks.length} outbreak{outbreaks.length === 1 ? '' : 's'}
      {l34 ? <>{' '}{'·'} <span className={CLASSES.hwBadgeWarn} style={STYLES.warn}>{l34} CDC L3+</span></> : null}
      {hw.asOf ? <>{' '}{'·'} {relTime(asText(hw.asOf))}</> : null}
    </>
  );

  return (
    <Panel id="pOsint" title={tr('panels.osintStream', 'Health watch')} badge={badge} isPadSm flex="1 1 300px">
      <div className={CLASSES.hwList}>
        {hasRows || error ? (
          <>
            <HealthBanner error={error} worst={worst} hasOutbreaks={outbreaks.length > 0} />
            {section(tr('health.whoOutbreaks', 'WHO outbreaks'), obRows)}
            {section(tr('health.cdcTravel', 'CDC travel notices'), trRows)}
            {section(tr('health.cdcInvestigations', 'CDC investigations'), usRows)}
          </>
        ) : (
          <div className={CLASSES.hwEmpty} style={STYLES.emptyHealth}>
            {tr('health.noNotices', 'No WHO or CDC health notices')} in the last {num(hw.activeDays) || 90} days.
          </div>
        )}
      </div>
    </Panel>
  );
}
