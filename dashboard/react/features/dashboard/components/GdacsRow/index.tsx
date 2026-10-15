import { CLASSES } from '../../classes';
import { asStrArr, asText, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { STYLES } from '../../styles';

export interface GdacsRowProps {
  event: Rec;
}

const DISASTER_ICON: Record<string, string> = {
  EQ: '▲', TC: '🌀', FL: '≈', VO: '△', DR: '☀', WF: '🔥',
};

const RED_MAG = { background: 'rgba(255,107,116,0.14)', color: 'var(--danger)', borderColor: 'rgba(255,107,116,0.4)' };
const ORANGE_MAG = { background: 'rgba(255,138,92,0.14)', color: '#ff8a5c', borderColor: 'rgba(255,138,92,0.4)' };

export function GdacsRow({ event }: GdacsRowProps) {
  const type = asText(event.type);
  const countries = asStrArr(event.countries);
  const title = `${asText(event.sev)}${countries.length > 1 ? ` · ${countries.join(', ')}` : ''}`;
  return (
    <a className={CLASSES.quakeRow} href={asText(event.url) || undefined} target="_blank" rel="noopener" title={title}>
      <span className={CLASSES.quakeMag} style={event.level === 'Red' ? RED_MAG : ORANGE_MAG}>{DISASTER_ICON[type] || type}</span>
      <span className={CLASSES.quakePlace}>{asText(event.name).replace(/^Tropical Cyclone /, 'TC ')}</span>
      <span className={CLASSES.quakeMeta}>
        {event.current ? <span className={CLASSES.quakeLive} style={STYLES.orange}>live</span> : relTime(asText(event.to) || asText(event.from))}
      </span>
    </a>
  );
}
