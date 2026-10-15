import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asArr, asRec, num, str, type Rec } from '../../coerce';
import { ROW_STYLES, TONE_STYLES } from '../../styles';
import { DailySpark } from '../DailySpark';

export interface ChokepointRowProps {
  chokepoint: Rec;
}

function pctSx(n: number) {
  return n <= -40 ? TONE_STYLES.danger : n <= -20 ? TONE_STYLES.warn : n >= 30 ? TONE_STYLES.mint : TONE_STYLES.text2;
}

function statusDot(status: string) {
  if (status === 'disrupted') return <Box component="span" className={CLASSES.chokepointDot} sx={TONE_STYLES.danger}>{'●'}</Box>;
  if (status === 'reduced') return <Box component="span" className={CLASSES.chokepointDot} sx={TONE_STYLES.warn}>{'●'}</Box>;
  if (status === 'watch') return <Box component="span" className={CLASSES.chokepointDot} sx={TONE_STYLES.warnFaded}>{'○'}</Box>;
  return null;
}

function rowTitle(c: Rec): string {
  const ongoing = asArr(c.events).find((e) => e.ongoing);
  return `${str(c.label)}: ${c.perDay ?? '--'} ships/day over the last 7 days vs ${c.base ?? '--'} one-year average`
    + `${c.trend != null ? ` · week ${num(c.trend) > 0 ? '+' : ''}${num(c.trend)}%` : ''}`
    + `${c.tanker != null ? ` · tankers ${num(c.tanker)}%` : ''}`
    + `${ongoing ? ` · ${str(ongoing.name)}` : ''}`;
}

export function ChokepointRow({ chokepoint: c }: ChokepointRowProps) {
  const dot = statusDot(str(c.status));
  const vessels = num(asRec(c.live).vessels);
  const pct = c.pct == null ? null : num(c.pct);
  return (
    <Box className={CLASSES.siteRow} sx={ROW_STYLES.siteRow} title={rowTitle(c)}>
      <Box component="span" className={CLASSES.siteName} sx={TONE_STYLES.ellipsis}>
        {dot ? <>{dot}{' '}</> : null}
        {str(c.label).replace(' Strait', '').replace('Strait of ', '').replace(' Canal', '')}
      </Box>
      <Box component="span" className={CLASSES.siteValue} sx={[ROW_STYLES.siteValue, TONE_STYLES.nowrap]}>
        {vessels ? (
          <Box component="span" className={CLASSES.chokepointLive} sx={TONE_STYLES.liveBadge} title={`${vessels} ships on AIS in the last hour`}>
            {'●'} {vessels} <Box component="span" className={CLASSES.chokepointLiveNow} sx={TONE_STYLES.faded}>now</Box>
          </Box>
        ) : null}
        <DailySpark values={c.daily} />
        {c.perDay != null ? Math.round(num(c.perDay)) : '--'}
        <Box component="span" className={CLASSES.chokepointUnit} sx={TONE_STYLES.faded}>/d</Box>{' '}
        {pct != null ? <Box component="span" className={CLASSES.chokepointPct} sx={pctSx(pct)}>{pct > 0 ? '+' : ''}{pct}%</Box> : null}
      </Box>
    </Box>
  );
}
