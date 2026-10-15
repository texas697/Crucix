import { CLASSES } from '../../classes';
import { asArr, asText, num, type Rec } from '../../coerce';
import { STYLES } from '../../styles';
import { ddosTitle } from '../OutagesPanel/outages';

export interface DdosLineProps {
  attacks: Rec;
}

export function DdosLine({ attacks }: DdosLineProps) {
  const l7 = asArr(attacks.l7Targets);
  if (!l7.length) return null;
  return (
    <div className={CLASSES.siteRow} title={ddosTitle(attacks)}>
      <span className={CLASSES.siteName} style={STYLES.ellipsis}>
        <span className={CLASSES.ddosLabel} style={STYLES.faded}>DDoS targets 24h</span>{' '}
        {l7.slice(0, 3).map((x, i) => (
          <span key={i} className={CLASSES.ddosTarget}>
            {i > 0 ? ' · ' : ''}
            {asText(x.name).replace('United States', 'US').replace('United Kingdom', 'UK')}
            <span className={CLASSES.ddosShare} style={STYLES.faded}> {num(x.pct)}%</span>
          </span>
        ))}
      </span>
    </div>
  );
}
