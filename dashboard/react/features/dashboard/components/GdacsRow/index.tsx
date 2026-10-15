import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asStrArr, asText, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { ROW_STYLES, TONE_STYLES } from '../../styles';
import { STYLES } from './styles';

export interface GdacsRowProps {
  event: Rec;
}

const DISASTER_ICON: Record<string, string> = {
  EQ: '▲', TC: '🌀', FL: '≈', VO: '△', DR: '☀', WF: '🔥',
};

export function GdacsRow({ event }: GdacsRowProps) {
  const type = asText(event.type);
  const countries = asStrArr(event.countries);
  const title = `${asText(event.sev)}${countries.length > 1 ? ` · ${countries.join(', ')}` : ''}`;
  return (
    <Box component="a" className={CLASSES.quakeRow} sx={ROW_STYLES.quakeRow} href={asText(event.url) || undefined} target="_blank" rel="noopener" title={title}>
      <Box component="span" className={CLASSES.quakeMag} sx={[ROW_STYLES.quakeMag, event.level === 'Red' ? STYLES.magRed : STYLES.magOrange]}>
        {DISASTER_ICON[type] || type}
      </Box>
      <Box component="span" className={CLASSES.quakePlace} sx={ROW_STYLES.quakePlace}>{asText(event.name).replace(/^Tropical Cyclone /, 'TC ')}</Box>
      <Box component="span" className={CLASSES.quakeMeta} sx={ROW_STYLES.quakeMeta}>
        {event.current ? <Box component="span" className={CLASSES.quakeLive} sx={TONE_STYLES.orange}>live</Box> : relTime(asText(event.to) || asText(event.from))}
      </Box>
    </Box>
  );
}
