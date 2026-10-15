import { useCallback } from 'react';
import Link from '@mui/material/Link';
import { abLinkFor } from '../../areaBriefFormat';
import type { AbArticle } from '../../areaBriefTypes';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface CiteLinkProps {
  index: number;
  article: AbArticle;
  onHover: (index: number | null) => void;
}

export function CiteLink({ index, article, onHover }: CiteLinkProps) {
  const onMouseEnter = useCallback(() => onHover(index), [onHover, index]);
  const onMouseLeave = useCallback(() => onHover(null), [onHover]);
  return (
    <Link
      className={CLASSES.briefCite}
      sx={STYLES.briefCite}
      href={abLinkFor(article)}
      target="_blank"
      rel="noopener noreferrer"
      title={`${article.source || ''}: ${article.title || ''}`}
      underline="none"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {index}
    </Link>
  );
}
