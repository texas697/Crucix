import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { Article } from '../../types';
import { ago } from '../../utils';

export interface ReaderMetaProps {
  article: Article | null;
  nowMs: number;
}

export function ReaderMeta({ article, nowMs }: ReaderMetaProps) {
  return (
    <Box className={CLASSES.meta} sx={STYLES.meta}>
      <Box className={CLASSES.kicker} sx={STYLES.kicker}>
        {article?.source && <Box component="span" className={CLASSES.source} sx={STYLES.source}>{article.source}</Box>}
        {article?.kind === 'thinktank' && <Box component="span" className={CLASSES.kind}>Think tank</Box>}
        {article?.publishedAt && <Box component="span" className={CLASSES.age}>{ago(article.publishedAt, nowMs)}</Box>}
        {article?.author && <Box component="span" className={CLASSES.author}>{article.author}</Box>}
      </Box>
      <Typography className={CLASSES.title} sx={STYLES.title} component="div">{article?.title || '(untitled)'}</Typography>
    </Box>
  );
}
