import Box from '@mui/material/Box';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export type SkeletonWidth = 'w1' | 'w2' | 'w3' | 'w4';

export interface BriefStatusProps {
  text: string;
  widths: readonly SkeletonWidth[];
}

export const LOADING_WIDTHS: readonly SkeletonWidth[] = ['w1', 'w2', 'w3', 'w4'];
export const WRITING_WIDTHS: readonly SkeletonWidth[] = ['w1', 'w2', 'w3'];

const WIDTH_CLASSES: Record<SkeletonWidth, string> = {
  w1: CLASSES.briefSkeletonW1,
  w2: CLASSES.briefSkeletonW2,
  w3: CLASSES.briefSkeletonW3,
  w4: CLASSES.briefSkeletonW4,
};

export function BriefStatus({ text, widths }: BriefStatusProps) {
  return (
    <>
      <Box className={CLASSES.briefStatus} sx={STYLES.briefStatus}>
        <Box component="span" className={CLASSES.briefPulse} sx={STYLES.briefPulse} />
        {text}
      </Box>
      {widths.map((width) => (
        <Box key={width} className={clsx(CLASSES.briefSkeleton, WIDTH_CLASSES[width])} sx={STYLES.briefSkeleton} />
      ))}
    </>
  );
}
