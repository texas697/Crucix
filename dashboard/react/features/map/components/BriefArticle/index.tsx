import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import clsx from 'clsx';
import { abAge, abLinkFor } from '../../areaBriefFormat';
import type { AbArticle } from '../../areaBriefTypes';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface BriefArticleProps {
  article: AbArticle;
  index: number;
  isHighlighted: boolean;
}

function viaLabel(article: AbArticle) {
  if (article.via === 'live') {
    return (
      <>
        {' · '}
        <Box component="span" className={CLASSES.briefItemLive} sx={STYLES.briefItemLive}>live</Box>
      </>
    );
  }
  return article.id ? ' · in digest' : '';
}

export function BriefArticle({ article, index, isHighlighted }: BriefArticleProps) {
  return (
    <Link
      className={clsx(CLASSES.briefItem, isHighlighted && CLASSES.briefItemHl)}
      id={`abn${index}`}
      sx={STYLES.briefItem}
      href={abLinkFor(article)}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
    >
      <Box component="span" className={CLASSES.briefItemTitle} sx={STYLES.briefItemTitle}>
        <Box component="span" className={CLASSES.briefItemIndex} sx={STYLES.briefItemIndex}>{index}</Box>
        {article.title}
      </Box>
      <Box component="span" className={CLASSES.briefItemMeta} sx={STYLES.briefItemMeta}>
        {article.source || ''}
        {article.publishedAt ? ` · ${abAge(article.publishedAt)}` : ''}
        {viaLabel(article)}
      </Box>
    </Link>
  );
}
