import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asRec, num, str, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { ROW_STYLES, TONE_STYLES } from '../../styles';

export interface NukeSiteRowProps {
  site: Rec;
}

function siteTitle(site: Rec, siteName: string, usvh: string, n: number): string {
  const nearest = site.nearest ? asRec(site.nearest) : null;
  return `${siteName} · ${usvh} median · ${n} live sensor${n > 1 ? 's' : ''} within ${num(site.radiusKm)} km · nearest `
    + `${nearest ? `${str(nearest.name)} (${num(nearest.distanceKm)} km)` : ''}`
    + `${site.last ? ` · latest ${relTime(str(site.last))}` : ''}`
    + `${site.note ? ` · ${str(site.note)}` : ''}`;
}

export function NukeSiteRow({ site }: NukeSiteRowProps) {
  const siteName = str(site.site);
  const n = num(site.n);
  const usvh = site.usvh != null ? `${num(site.usvh) < 0.01 ? '<0.01' : num(site.usvh).toFixed(2)} µSv/h` : '';
  const cpm = site.cpm != null ? `${Math.round(num(site.cpm))} CPM` : '--';
  const hot = num(site.hot);
  const flag = site.anom
    ? <Box component="span" className={CLASSES.siteFlag} sx={TONE_STYLES.danger}>▲</Box>
    : hot
      ? <Box component="span" className={CLASSES.siteFlag} sx={TONE_STYLES.warn} title={`${hot} sensor${hot > 1 ? 's' : ''} above ${num(site.alertUsvh)} µSv/h`}>▲</Box>
      : null;
  return (
    <Box className={CLASSES.siteRow} sx={ROW_STYLES.siteRow} title={siteTitle(site, siteName, usvh, n)}>
      <Box component="span" className={CLASSES.siteName} sx={TONE_STYLES.ellipsis}>
        {siteName.replace(/ \(.*\)$/, '').replace('Exclusion Zone', 'zone')}
        <Box component="span" className={CLASSES.siteCount} sx={TONE_STYLES.dimInline}> · {n}</Box>
      </Box>
      <Box component="span" className={CLASSES.siteValue} sx={[ROW_STYLES.siteValue, TONE_STYLES.nowrap]}>
        {cpm}
        {flag ? <>{' '}{flag}</> : null}
      </Box>
    </Box>
  );
}
