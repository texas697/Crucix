import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asArr, asText, num, type Rec } from '../../coerce';
import { ROW_STYLES, TONE_STYLES } from '../../styles';
import { ddosTitle } from '../OutagesPanel/outages';

export interface DdosLineProps {
  attacks: Rec;
}

export function DdosLine({ attacks }: DdosLineProps) {
  const l7 = asArr(attacks.l7Targets);
  if (!l7.length) return null;
  return (
    <Box className={CLASSES.siteRow} sx={ROW_STYLES.siteRow} title={ddosTitle(attacks)}>
      <Box component="span" className={CLASSES.siteName} sx={TONE_STYLES.ellipsis}>
        <Box component="span" className={CLASSES.ddosLabel} sx={TONE_STYLES.faded}>DDoS targets 24h</Box>{' '}
        {l7.slice(0, 3).map((x, i) => (
          <Box component="span" key={i} className={CLASSES.ddosTarget}>
            {i > 0 ? ' · ' : ''}
            {asText(x.name).replace('United States', 'US').replace('United Kingdom', 'UK')}
            <Box component="span" className={CLASSES.ddosShare} sx={TONE_STYLES.faded}> {num(x.pct)}%</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
