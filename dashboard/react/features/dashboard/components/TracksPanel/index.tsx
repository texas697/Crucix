import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { makeLabel } from '../../label';
import { TONE_STYLES } from '../../styles';
import type { PanelDataProps, TrackItem } from '../../types';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';
import { TrackRow } from '../TrackRow';
import { STYLES } from '../TrackRow/styles';

export interface TracksPanelProps extends PanelDataProps {
  tracks?: TrackItem[];
}

const NEPTUN_URL = 'https://neptun.in.ua/karta-shahediv';

export function TracksPanel({ t, tracks }: TracksPanelProps) {
  const tr = makeLabel(t);
  const neptunHref = safeExternalUrl(NEPTUN_URL) ?? undefined;
  let badge: string;
  let body: ReactNode;
  if (!tracks) {
    badge = 'connecting';
    body = <PanelSource>Connecting to Neptun{'…'}</PanelSource>;
  } else if (!tracks.length) {
    badge = '0 live';
    body = <PanelSource sx={TONE_STYLES.softFaded}>No active tracks.</PanelSource>;
  } else {
    badge = `${tracks.length} live`;
    body = (
      <>
        {tracks.slice(0, 10).map((x, i) => <TrackRow key={i} track={x} />)}
        <PanelSource>
          Live from <Box component="a" className={CLASSES.trackSourceLink} sx={STYLES.trackSourceLink} href={neptunHref} target="_blank" rel="noopener">Neptun {'↗'}</Box>
        </PanelSource>
      </>
    );
  }
  return (
    <Panel id="pTracks" title={tr('panels.droneMissileTracker', 'Drone & missile tracker')} badge={badge} flex="2 1 340px">
      {body}
    </Panel>
  );
}
