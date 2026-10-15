import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asText, num, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { ROW_STYLES, TONE_STYLES } from '../../styles';
import { outageTitle, shortCause } from '../OutagesPanel/outages';

export interface OutageRowProps {
  country: Rec;
}

function dropSx(drop: number) {
  return drop >= 50 ? TONE_STYLES.danger : drop >= 25 ? TONE_STYLES.warn : TONE_STYLES.text2;
}

function markSx(isNational: boolean, isMinor: boolean) {
  return isNational ? TONE_STYLES.violet : isMinor ? TONE_STYLES.violetFaded : TONE_STYLES.fadedTight;
}

export function OutageRow({ country: c }: OutageRowProps) {
  const national = !!c.national;
  const minor = !!c.minor;
  const drop = c.drop;
  const regions = num(c.regions);
  const asns = num(c.asns);
  const since = asText(c.since);
  const causeShort = shortCause(c);
  return (
    <Box className={CLASSES.siteRow} sx={ROW_STYLES.siteRow} title={outageTitle(c)}>
      <Box component="span" className={CLASSES.siteName} sx={TONE_STYLES.ellipsis}>
        <Box component="span" className={CLASSES.outageMark} sx={markSx(national, minor)}>{national ? '●' : '○'}</Box>{' '}
        {asText(c.name)}
        {causeShort ? <Box component="span" className={CLASSES.outageCause} sx={TONE_STYLES.dimCause}> · {causeShort}</Box> : null}
      </Box>
      <Box component="span" className={CLASSES.siteValue} sx={[ROW_STYLES.siteValue, TONE_STYLES.nowrap]}>
        {drop != null ? <Box component="span" className={CLASSES.outageDrop} sx={dropSx(num(drop))}>−{num(drop)}%</Box> : null}
        {!national && (regions || asns) ? (
          <Box component="span" className={CLASSES.outageScope} sx={drop != null ? TONE_STYLES.fadedSpaced : TONE_STYLES.faded}>
            {regions ? `${regions} reg` : ''}{regions && asns ? ' · ' : ''}{asns ? `${asns} net` : ''}
          </Box>
        ) : null}
        {since ? <Box component="span" className={CLASSES.outageSince} sx={TONE_STYLES.fadedSpaced}>{relTime(since)}</Box> : null}
      </Box>
    </Box>
  );
}
