import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { ago } from '../../format';
import { useDigestCardActions } from '../../hooks/useDigestCardActions';
import { STYLES } from '../../styles';
import type { DigestCardItem } from '../../types';

export interface DigestCardProps {
  article: DigestCardItem;
  now: () => number;
  onOpen: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

export function DigestCard({ article, now, onOpen, onRate }: DigestCardProps) {
  const vote = article.vote ?? 0;
  const actions = useDigestCardActions({ id: article.id, onOpen, onRate });
  return (
    <div
      className={clsx(CLASSES.card, vote > 0 && CLASSES.cardVotedUp, vote < 0 && CLASSES.cardVotedDown)}
      data-id={article.id}
      role="listitem"
      onClick={actions.onOpenCard}
    >
      <div className={CLASSES.cardTop}>
        <span className={clsx(CLASSES.cardSource, article.kind === 'thinktank' && CLASSES.cardSourceThinkTank)}>{article.source}</span>
        <span className={CLASSES.cardAge}>{article.publishedAt ? ago(article.publishedAt, now()) : ''}</span>
      </div>
      <div className={CLASSES.cardTitle}>{article.title}</div>
      <div className={CLASSES.cardDesc}>{article.description || ''}</div>
      <div className={CLASSES.cardFoot}>
        <div className={CLASSES.cardTags} style={STYLES.cardTags}>
          {article.hasWriteup ? <span className={clsx(CLASSES.tag, CLASSES.tagAi)}>AI WRITE-UP</span> : null}
          {(article.topics ?? []).slice(0, 3).map((t) => <span className={CLASSES.tag} key={t}>{t}</span>)}
        </div>
        <div className={CLASSES.thumbs} onClick={actions.onStopPropagation}>
          <button
            type="button"
            className={clsx(CLASSES.thumb, CLASSES.thumbUp, vote > 0 && CLASSES.thumbOn)}
            title="More like this"
            aria-label="More like this"
            aria-pressed={vote > 0}
            onClick={actions.onRateUp}
          >👍</button>
          <button
            type="button"
            className={clsx(CLASSES.thumb, CLASSES.thumbDown, vote < 0 && CLASSES.thumbOn)}
            title="Less like this"
            aria-label="Less like this"
            aria-pressed={vote < 0}
            onClick={actions.onRateDown}
          >👎</button>
        </div>
      </div>
    </div>
  );
}
