import { CLASSES } from '../../classes';
import { asText, num, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { STYLES } from '../../styles';
import { outageTitle, shortCause } from '../OutagesPanel/outages';

export interface OutageRowProps {
  country: Rec;
}

function dropStyle(drop: number) {
  return drop >= 50 ? STYLES.danger : drop >= 25 ? STYLES.warn : STYLES.text2;
}

export function OutageRow({ country: c }: OutageRowProps) {
  const national = !!c.national;
  const minor = !!c.minor;
  const drop = c.drop;
  const regions = num(c.regions);
  const asns = num(c.asns);
  const since = asText(c.since);
  const causeShort = shortCause(c);
  const mark = national
    ? <span className={CLASSES.outageMark} style={STYLES.violet}>●</span>
    : minor
      ? <span className={CLASSES.outageMark} style={STYLES.violetFaded}>○</span>
      : <span className={CLASSES.outageMark} style={STYLES.fadedTight}>○</span>;
  return (
    <div className={CLASSES.siteRow} title={outageTitle(c)}>
      <span className={CLASSES.siteName} style={STYLES.ellipsis}>
        {mark}{' '}
        {asText(c.name)}
        {causeShort ? <span className={CLASSES.outageCause} style={STYLES.dimCause}> · {causeShort}</span> : null}
      </span>
      <span className={CLASSES.siteValue} style={STYLES.nowrap}>
        {drop != null ? <span className={CLASSES.outageDrop} style={dropStyle(num(drop))}>−{num(drop)}%</span> : null}
        {!national && (regions || asns) ? (
          <span className={CLASSES.outageScope} style={drop != null ? STYLES.fadedSpaced : STYLES.faded}>
            {regions ? `${regions} reg` : ''}{regions && asns ? ' · ' : ''}{asns ? `${asns} net` : ''}
          </span>
        ) : null}
        {since ? <span className={CLASSES.outageSince} style={STYLES.fadedSpaced}>{relTime(since)}</span> : null}
      </span>
    </div>
  );
}
