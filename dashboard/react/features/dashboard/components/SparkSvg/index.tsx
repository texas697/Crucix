import Box from '@mui/material/Box';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES } from './styles';

export interface SparkSvgProps {
  values: number[];
  isGood: boolean;
}

const W = 52;
const H = 18;
const PAD = 2;

export function SparkSvg({ values, isGood }: SparkSvgProps) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = PAD + ((max - v) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const tone = isGood ? CLASSES.sparkGood : CLASSES.sparkBad;
  const [lastX, lastY] = pts[pts.length - 1]!.split(',');
  return (
    <Box component="svg" className={CLASSES.sparkSvg} sx={STYLES.sparkSvg} viewBox={`0 0 ${W} ${H}`}>
      <Box component="polyline" className={clsx(CLASSES.sparkLine, tone)} sx={[STYLES.sparkLine, isGood ? STYLES.sparkGood : STYLES.sparkBad]} points={pts.join(' ')} />
      <Box
        component="circle"
        className={clsx(tone, CLASSES.sparkDot)}
        sx={[STYLES.sparkDot, isGood ? STYLES.sparkGood : STYLES.sparkBad, isGood ? STYLES.sparkDotGood : STYLES.sparkDotBad]}
        cx={lastX}
        cy={lastY}
        r={2}
      />
    </Box>
  );
}
