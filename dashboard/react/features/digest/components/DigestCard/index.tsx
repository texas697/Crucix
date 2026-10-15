import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { ago } from '../../format';
import { useDigestCardActions } from '../../hooks/useDigestCardActions';
import type { DigestCardItem } from '../../types';
import { STYLES } from './styles';

export interface DigestCardProps {
  article: DigestCardItem;
  now: () => number;
  onOpen: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

export function DigestCard({ article, now, onOpen, onRate }: DigestCardProps) {
  const vote = article.vote ?? 0;
  const isUp = vote > 0;
  const isDown = vote < 0;
  const isThinkTank = article.kind === 'thinktank';
  const actions = useDigestCardActions({ id: article.id, onOpen, onRate });
  return (
    <Card
      className={clsx(CLASSES.card, isUp && CLASSES.cardVotedUp, isDown && CLASSES.cardVotedDown)}
      sx={[STYLES.card, isUp && STYLES.cardVotedUp, isDown && STYLES.cardVotedDown]}
      data-id={article.id}
      role="listitem"
      onClick={actions.onOpenCard}
    >
      <Box className={CLASSES.cardTop} sx={STYLES.cardTop}>
        <Box
          component="span"
          className={clsx(CLASSES.cardSource, isThinkTank && CLASSES.cardSourceThinkTank)}
          sx={[STYLES.cardSource, isThinkTank && STYLES.cardSourceThinkTank]}
        >
          {article.source}
        </Box>
        <Box component="span" className={CLASSES.cardAge}>{article.publishedAt ? ago(article.publishedAt, now()) : ''}</Box>
      </Box>
      <Typography component="div" className={CLASSES.cardTitle} sx={STYLES.cardTitle}>{article.title}</Typography>
      <Typography component="div" className={CLASSES.cardDesc} sx={STYLES.cardDesc}>{article.description || ''}</Typography>
      <Box className={CLASSES.cardFoot} sx={STYLES.cardFoot}>
        <Box className={CLASSES.cardTags} sx={STYLES.cardTags}>
          {article.hasWriteup ? <Chip label="AI WRITE-UP" className={clsx(CLASSES.tag, CLASSES.tagAi)} sx={[STYLES.tag, STYLES.tagAi]} /> : null}
          {(article.topics ?? []).slice(0, 3).map((t) => <Chip key={t} label={t} className={CLASSES.tag} sx={STYLES.tag} />)}
        </Box>
        <Box className={CLASSES.thumbs} sx={STYLES.thumbs} onClick={actions.onStopPropagation}>
          <IconButton
            className={clsx(CLASSES.thumb, CLASSES.thumbUp, isUp && CLASSES.thumbOn)}
            sx={[STYLES.thumb, isUp && STYLES.thumbUpOn]}
            title="More like this"
            aria-label="More like this"
            aria-pressed={isUp}
            onClick={actions.onRateUp}
          >
            👍
          </IconButton>
          <IconButton
            className={clsx(CLASSES.thumb, CLASSES.thumbDown, isDown && CLASSES.thumbOn)}
            sx={[STYLES.thumb, isDown && STYLES.thumbDownOn]}
            title="Less like this"
            aria-label="Less like this"
            aria-pressed={isDown}
            onClick={actions.onRateDown}
          >
            👎
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
}
