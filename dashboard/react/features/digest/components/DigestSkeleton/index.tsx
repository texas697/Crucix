import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { CLASSES } from '../../classes';
import { STYLES } from './styles';

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;

const LINES = [
  { key: 'top', sx: STYLES.top },
  { key: 'title', sx: STYLES.title },
  { key: 'titleTail', sx: STYLES.titleTail },
  { key: 'line1', sx: STYLES.line },
  { key: 'line2', sx: STYLES.line },
  { key: 'line3', sx: STYLES.lineTail },
  { key: 'foot', sx: STYLES.foot },
] as const;

export function DigestSkeleton() {
  return (
    <>
      {SKELETON_KEYS.map((key) => (
        <Paper key={key} className={CLASSES.skeleton} sx={STYLES.skeleton} aria-hidden="true">
          {LINES.map((line) => (
            <Skeleton key={line.key} variant="rounded" className={CLASSES.skeletonLine} sx={line.sx} />
          ))}
        </Paper>
      ))}
    </>
  );
}
