import { CLASSES } from '../../classes';
import { asText, num, type Rec } from '../../coerce';
import { magColor } from '../../format';
import { STYLES } from '../../styles';

export interface QuakeRowProps {
  quake: Rec;
}

export function QuakeRow({ quake }: QuakeRowProps) {
  const mc = magColor(num(quake.mag));
  const depth = quake.depth;
  return (
    <a className={CLASSES.quakeRow} href={asText(quake.url) || '#'} target="_blank" rel="noopener">
      <span className={CLASSES.quakeMag} style={{ background: `${mc}22`, color: mc, borderColor: `${mc}66` }}>
        {num(quake.mag).toFixed(1)}
      </span>
      <span className={CLASSES.quakePlace}>{asText(quake.place)}</span>
      <span className={CLASSES.quakeMeta}>
        {depth != null ? `${Math.round(num(depth))} km` : ''}
        {quake.tsunami ? <span className={CLASSES.quakeTsunami} style={STYLES.orange}> tsunami</span> : null}
      </span>
    </a>
  );
}
