import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { decodeText, getAge } from '../../format';
import type { TickerItem } from '../../types';
import { STYLES } from './styles';

export interface NewsItemProps {
  item: TickerItem;
  nowMs: number;
}

export function NewsItem({ item, nowMs }: NewsItemProps) {
  const href = safeExternalUrl(item.url) ?? undefined;
  const text = decodeText(item.headline) || '(untitled)';
  const className = clsx(CLASSES.newsItem, item.urgent && CLASSES.newsItemUrgent, href && CLASSES.newsItemClickable);
  const sx = [STYLES.newsItem, !!href && STYLES.newsItemClickable];
  const body = (
    <>
      <Box component="span" className={CLASSES.newsMeta} sx={STYLES.newsMeta}>
        <Box component="span" className={CLASSES.newsSource} sx={STYLES.newsSource}>{item.source || 'News'}</Box>
        <Box component="span" className={CLASSES.newsAge}>{getAge(item.timestamp, nowMs)}</Box>
        {href ? <Box component="span" className={CLASSES.newsLink} sx={STYLES.newsLink} aria-hidden="true">↗</Box> : null}
      </Box>
      <Typography component="span" className={CLASSES.newsTitle} sx={[STYLES.newsTitle, !!item.urgent && STYLES.newsTitleUrgent]}>
        {text}
      </Typography>
    </>
  );
  return href
    ? <Box component="a" className={className} sx={sx} href={href} target="_blank" rel="noopener noreferrer">{body}</Box>
    : <Box className={className} sx={sx}>{body}</Box>;
}
