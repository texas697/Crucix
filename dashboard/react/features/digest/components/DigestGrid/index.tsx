import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import type { DigestCardItem } from '../../types';
import { DigestCard } from '../DigestCard';
import { DigestEmpty } from '../DigestEmpty';
import { DigestSkeleton } from '../DigestSkeleton';
import { STYLES } from './styles';

export interface DigestGridProps {
  items: DigestCardItem[];
  isLoading: boolean;
  now: () => number;
  onOpen: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

function renderBody({ items, isLoading, now, onOpen, onRate }: DigestGridProps) {
  if (items.length > 0) return items.map((a) => <DigestCard key={a.id} article={a} now={now} onOpen={onOpen} onRate={onRate} />);
  return isLoading ? <DigestSkeleton /> : <DigestEmpty />;
}

export function DigestGrid(props: DigestGridProps) {
  return (
    <Box className={CLASSES.grid} sx={STYLES.grid} role="list">
      {renderBody(props)}
    </Box>
  );
}
