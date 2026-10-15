import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asStrArr, asText, num } from '../../coerce';
import { relTime } from '../../format';
import { ROW_STYLES, TONE_STYLES } from '../../styles';
import { annotationCause, annotationWhere, type RadarAnnotation } from '../OutagesPanel/outages';

export interface RadarAnnotationRowProps {
  annotation: RadarAnnotation;
}

export function RadarAnnotationRow({ annotation: a }: RadarAnnotationRowProps) {
  const names = asStrArr(a.names);
  const label = `${annotationWhere(a)}${names.length > 1 ? ` +${names.length - 1}` : ''}`;
  return (
    <Box component="a" className={CLASSES.hwRow} sx={ROW_STYLES.hwRow} href={asText(a.url) || undefined} target="_blank" rel="noopener" title={asText(a.desc)}>
      <Box component="span" className={CLASSES.hwMain} sx={ROW_STYLES.hwMain}>
        <Box component="span" className={CLASSES.hwTitle} sx={ROW_STYLES.hwTitle}>
          {a.active ? <><Box component="span" className={CLASSES.hwActiveMark} sx={TONE_STYLES.violet}>●</Box>{' '}</> : null}
          {label} · {annotationCause(a)}
          {num(a.n) > 1 ? <Box component="span" className={CLASSES.hwCount} sx={TONE_STYLES.faded}> ×{num(a.n)}</Box> : null}
        </Box>
        <Box component="span" className={CLASSES.hwSub} sx={ROW_STYLES.hwSub}>{asText(a.desc)}</Box>
      </Box>
      <Box component="span" className={CLASSES.hwSub} sx={[ROW_STYLES.hwSub, TONE_STYLES.nowrap]}>
        {a.active ? 'ongoing' : relTime(asText(a.end) || asText(a.start))}
      </Box>
    </Box>
  );
}
