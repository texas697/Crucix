import type { ReactNode } from 'react';
import { CLASSES } from '../../classes';
import { asArr, asRec, num, type Rec } from '../../coerce';
import { makeLabel } from '../../label';
import { STYLES } from '../../styles';
import type { PanelDataProps, QuakeItem } from '../../types';
import { GdacsRow } from '../GdacsRow';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';
import { QuakeRow } from '../QuakeRow';

export interface DisastersPanelProps extends PanelDataProps {
  quakes?: QuakeItem[];
}

export function DisastersPanel({ data, t, quakes }: DisastersPanelProps) {
  const tr = makeLabel(t);
  const disasters = asRec(data.disasters);
  const events = asArr(disasters.events);
  const counts = asRec(disasters.counts);
  const hasGdacs = events.length > 0;
  const quakeList = (quakes ?? []).map((q) => q as unknown as Rec);

  const gdacsHead = hasGdacs ? (
    <>
      <div className={CLASSES.sectionHead} style={STYLES.sectionHeadTight}>
        GDACS · {num(counts.red)} red · {num(counts.orange)} orange
      </div>
      {events.slice(0, 6).map((e, i) => <GdacsRow key={`gdacs-${i}`} event={e} />)}
      <div className={CLASSES.sectionHead}>Earthquakes · USGS</div>
    </>
  ) : null;

  let badge = `${events.length} GDACS`;
  let body: ReactNode;
  if (quakes === undefined) {
    body = <>{gdacsHead}<PanelSource>Loading quakes…</PanelSource></>;
  } else if (!quakeList.length) {
    body = <>{gdacsHead}<PanelSource>No M2.5+ quakes in the last 24h.</PanelSource></>;
  } else {
    badge = `${events.length} GDACS · ${quakeList.length} quakes`;
    body = (
      <>
        {gdacsHead}
        {quakeList.slice(0, hasGdacs ? 5 : 10).map((q, i) => <QuakeRow key={`usgs-${i}`} quake={q} />)}
        <PanelSource>GDACS Orange/Red alerts · USGS M2.5+, past 24h</PanelSource>
      </>
    );
  }

  return (
    <Panel id="pQuakes" title={tr('panels.disasters', 'Disasters')} badge={badge} flex="1 1 240px">
      {body}
    </Panel>
  );
}
