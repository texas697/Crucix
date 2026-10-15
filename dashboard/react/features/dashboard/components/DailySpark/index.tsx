import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asNumArr } from '../../coerce';
import { STYLES } from './styles';

export interface DailySparkProps {
  values: unknown;
}

const W = 56;
const H = 14;

export function DailySpark({ values }: DailySparkProps) {
  const series = asNumArr(values);
  if (series.length < 2) return null;
  const mx = Math.max(...series, 1);
  const pts = series
    .map((v, i) => `${(i / (series.length - 1) * W).toFixed(1)},${(H - (v / mx) * H).toFixed(1)}`)
    .join(' ');
  return (
    <Box component="svg" className={CLASSES.chokepointSpark} sx={STYLES.spark} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Box component="polyline" className={CLASSES.chokepointSparkLine} sx={STYLES.sparkLine} points={pts} />
    </Box>
  );
}
