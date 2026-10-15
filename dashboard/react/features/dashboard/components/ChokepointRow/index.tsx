import { CLASSES } from '../../classes';
import { asArr, asRec, num, str, type Rec } from '../../coerce';
import { STYLES } from '../../styles';
import { DailySpark } from '../DailySpark';

export interface ChokepointRowProps {
  chokepoint: Rec;
}

function pctStyle(n: number) {
  return n <= -40 ? STYLES.danger : n <= -20 ? STYLES.warn : n >= 30 ? STYLES.mint : STYLES.text2;
}

function statusDot(status: string) {
  if (status === 'disrupted') return <span className={CLASSES.chokepointDot} style={STYLES.danger}>{'●'}</span>;
  if (status === 'reduced') return <span className={CLASSES.chokepointDot} style={STYLES.warn}>{'●'}</span>;
  if (status === 'watch') return <span className={CLASSES.chokepointDot} style={STYLES.warnFaded}>{'○'}</span>;
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
    <div className={CLASSES.siteRow} title={rowTitle(c)}>
      <span className={CLASSES.siteName} style={STYLES.ellipsis}>
        {dot ? <>{dot}{' '}</> : null}
        {str(c.label).replace(' Strait', '').replace('Strait of ', '').replace(' Canal', '')}
      </span>
      <span className={CLASSES.siteValue} style={STYLES.nowrap}>
        {vessels ? (
          <span className={CLASSES.chokepointLive} style={STYLES.liveBadge} title={`${vessels} ships on AIS in the last hour`}>
            {'●'} {vessels} <span className={CLASSES.chokepointLiveNow} style={STYLES.faded}>now</span>
          </span>
        ) : null}
        <DailySpark values={c.daily} />
        {c.perDay != null ? Math.round(num(c.perDay)) : '--'}
        <span className={CLASSES.chokepointUnit} style={STYLES.faded}>/d</span>{' '}
        {pct != null ? <span className={CLASSES.chokepointPct} style={pctStyle(pct)}>{pct > 0 ? '+' : ''}{pct}%</span> : null}
      </span>
    </div>
  );
}
