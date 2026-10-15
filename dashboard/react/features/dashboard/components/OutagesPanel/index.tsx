import type { ReactNode } from 'react';
import { asArr, asRec, asText, num } from '../../coerce';
import { makeLabel } from '../../label';
import type { PanelDataProps } from '../../types';
import { OutageRow } from '../OutageRow';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';
import { RadarSection } from '../RadarSection';
import { StatusBanner } from '../StatusBanner';
import { nationalOutages, regionalOutages } from './outages';

const NATIONAL_BANNER = { color: '#c084fc', background: 'rgba(192,132,252,0.08)' };

export function OutagesPanel({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const outages = asRec(data.outages);
  const countries = asArr(outages.countries);
  const nat = nationalOutages(countries);
  const rest = regionalOutages(countries);
  const outageError = asText(outages.error);
  const windowHours = num(outages.windowHours) || 24;
  const radar = asRec(outages.radar);

  let body: ReactNode;
  if (outageError) {
    body = <PanelSource>{outageError}</PanelSource>;
  } else if (nat.length || rest.length) {
    body = (
      <>
        {nat.map((c, i) => <OutageRow key={`nat-${i}`} country={c} />)}
        {rest.slice(0, 8 - Math.min(nat.length, 8)).map((c, i) => <OutageRow key={`rest-${i}`} country={c} />)}
      </>
    );
  } else {
    body = <PanelSource>No internet disruptions detected in the last {windowHours}h.</PanelSource>;
  }

  const first = nat[0];
  return (
    <Panel
      id="pOutages"
      title={tr('panels.internetOutages', 'Internet outages')}
      badge={`${num(asRec(outages.counts).critical)} alerts · ${windowHours}h`}
      flex="1 1 240px"
    >
      {first ? (
        <StatusBanner tone="anom" style={NATIONAL_BANNER}>
          ⚠ {asText(first.name)}{' '}
          {first.drop != null ? `−${num(first.drop)}% connectivity` : 'national alert'}
          {nat.length > 1 ? ` +${nat.length - 1} more` : ''}
        </StatusBanner>
      ) : (
        <StatusBanner tone="ok">● No national-scale outages</StatusBanner>
      )}
      {body}
      <RadarSection radar={radar} />
      <PanelSource>
        IODA · BGP, active probing, darknet · below each country's own baseline
        {radar.enabled ? ' · Cloudflare Radar annotations and DDoS shares' : ''}
      </PanelSource>
    </Panel>
  );
}
