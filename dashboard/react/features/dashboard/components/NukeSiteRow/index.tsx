import { CLASSES } from '../../classes';
import { asRec, num, str, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { STYLES } from '../../styles';

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
    ? <span className={CLASSES.siteFlag} style={STYLES.danger}>▲</span>
    : hot
      ? <span className={CLASSES.siteFlag} style={STYLES.warn} title={`${hot} sensor${hot > 1 ? 's' : ''} above ${num(site.alertUsvh)} µSv/h`}>▲</span>
      : null;
  return (
    <div className={CLASSES.siteRow} title={siteTitle(site, siteName, usvh, n)}>
      <span className={CLASSES.siteName} style={STYLES.ellipsis}>
        {siteName.replace(/ \(.*\)$/, '').replace('Exclusion Zone', 'zone')}
        <span className={CLASSES.siteCount} style={STYLES.dimInline}> · {n}</span>
      </span>
      <span className={CLASSES.siteValue} style={STYLES.nowrap}>
        {cpm}
        {flag ? <>{' '}{flag}</> : null}
      </span>
    </div>
  );
}
