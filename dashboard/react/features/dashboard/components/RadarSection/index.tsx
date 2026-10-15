import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asArr, asRec, type Rec } from '../../coerce';
import { ROW_STYLES } from '../../styles';
import { DdosLine } from '../DdosLine';
import { groupAnnotations } from '../OutagesPanel/outages';
import { RadarAnnotationRow } from '../RadarAnnotationRow';

export interface RadarSectionProps {
  radar: Rec;
}

export function RadarSection({ radar }: RadarSectionProps) {
  if (!radar.enabled || radar.error) return null;
  const annotations = groupAnnotations(radar.annotations).slice(0, 5);
  const attacks = asRec(radar.attacks);
  const hasDdos = asArr(attacks.l7Targets).length > 0;
  if (!annotations.length && !hasDdos) return null;
  const anomalies = asArr(radar.anomalies);
  return (
    <>
      <Box className={CLASSES.sectionHead} sx={ROW_STYLES.sectionHead}>
        Cloudflare Radar
        {anomalies.length ? ` · ${anomalies.length} verified anomal${anomalies.length === 1 ? 'y' : 'ies'} 24h` : ''}
      </Box>
      {annotations.map((a, i) => <RadarAnnotationRow key={`ann-${i}`} annotation={a} />)}
      <DdosLine attacks={attacks} />
    </>
  );
}
