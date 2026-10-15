import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { asArr, asRec, num, str } from '../../coerce';
import type { Label } from '../../label';
import { TONE_STYLES } from '../../styles';
import type { PanelDataProps } from '../../types';
import { EconRow } from '../EconRow';
import { IssRow } from '../IssRow';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';
import { SpaceWeatherRows } from '../SpaceWeatherRows';
import { TiangongRow } from '../TiangongRow';
import { STYLES } from './styles';

export interface SpacePanelProps extends Pick<PanelDataProps, 'data'> {
  tr: Label;
}

const TIANGONG_NORAD = 48274;

export function SpacePanel({ data, tr }: SpacePanelProps) {
  const spRaw = data.space;
  const hasSpace = !!spRaw && typeof spRaw === 'object' && !Array.isArray(spRaw);
  const sp = asRec(spRaw);
  const constellations = asRec(sp.constellations);
  const stations = asArr(sp.stations);
  const signals = Array.isArray(sp.signals) ? (sp.signals as unknown[]).map(str) : [];
  const iss = sp.iss && typeof sp.iss === 'object' && !Array.isArray(sp.iss) ? asRec(sp.iss) : null;
  const tiangong = stations.find((s) => num(s.noradId) === TIANGONG_NORAD);

  return (
    <Panel id="pSpace" title={tr('panels.spaceWatch', 'Space watch')} badge="Orbital" flex="1 1 280px">
      {hasSpace ? (
        <>
          <EconRow label="New objects (30d)" value={num(sp.totalNewObjects)} valueSx={TONE_STYLES.accent2} />
          <EconRow label="Military sats" value={num(sp.militarySats)} />
          <EconRow label="Starlink" value={num(constellations.starlink)} />
          <EconRow label="OneWeb" value={num(constellations.oneweb)} />
          {iss ? <IssRow iss={iss} /> : null}
          {tiangong ? <TiangongRow station={tiangong} /> : null}
          <SpaceWeatherRows spaceWeather={data.spaceWeather} />
          {signals.length ? <Typography component="p" className={CLASSES.panelNote} sx={STYLES.panelNote}>{signals.slice(0, 2).join(' ')}</Typography> : null}
        </>
      ) : <PanelSource>No space data.</PanelSource>}
    </Panel>
  );
}
