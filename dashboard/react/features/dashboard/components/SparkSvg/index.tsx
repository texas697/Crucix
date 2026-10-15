import clsx from 'clsx';
import { CLASSES } from '../../classes';

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
    <svg className={CLASSES.sparkSvg} viewBox={`0 0 ${W} ${H}`}>
      <polyline className={clsx(CLASSES.sparkLine, tone)} points={pts.join(' ')} />
      <circle className={clsx(tone, CLASSES.sparkDot)} cx={lastX} cy={lastY} r={2} fill={isGood ? 'var(--accent)' : 'var(--danger)'} />
    </svg>
  );
}
