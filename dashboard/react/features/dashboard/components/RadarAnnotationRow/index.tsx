import { CLASSES } from '../../classes';
import { asStrArr, asText, num } from '../../coerce';
import { relTime } from '../../format';
import { STYLES } from '../../styles';
import { annotationCause, annotationWhere, type RadarAnnotation } from '../OutagesPanel/outages';

export interface RadarAnnotationRowProps {
  annotation: RadarAnnotation;
}

export function RadarAnnotationRow({ annotation: a }: RadarAnnotationRowProps) {
  const names = asStrArr(a.names);
  const label = `${annotationWhere(a)}${names.length > 1 ? ` +${names.length - 1}` : ''}`;
  return (
    <a className={CLASSES.hwRow} href={asText(a.url) || undefined} target="_blank" rel="noopener" title={asText(a.desc)}>
      <span className={CLASSES.hwMain}>
        <span className={CLASSES.hwTitle}>
          {a.active ? <><span className={CLASSES.hwActiveMark} style={STYLES.violet}>●</span>{' '}</> : null}
          {label} · {annotationCause(a)}
          {num(a.n) > 1 ? <span className={CLASSES.hwCount} style={STYLES.faded}> ×{num(a.n)}</span> : null}
        </span>
        <span className={CLASSES.hwSub}>{asText(a.desc)}</span>
      </span>
      <span className={CLASSES.hwSub} style={STYLES.nowrap}>
        {a.active ? 'ongoing' : relTime(asText(a.end) || asText(a.start))}
      </span>
    </a>
  );
}
