import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { Article } from '../../types';
import { ReaderActions } from '../ReaderActions';
import { ReaderMeta } from '../ReaderMeta';

export interface ReaderHeaderProps {
  article: Article | null;
  nowMs: number;
  originalHref?: string;
  onVote: (rating: number) => void;
  onClose: () => void;
}

export function ReaderHeader({ article, nowMs, originalHref, onVote, onClose }: ReaderHeaderProps) {
  return (
    <Box className={CLASSES.head} sx={STYLES.head}>
      <ReaderMeta article={article} nowMs={nowMs} />
      <ReaderActions vote={article?.vote ?? 0} originalHref={originalHref} onVote={onVote} onClose={onClose} />
    </Box>
  );
}
