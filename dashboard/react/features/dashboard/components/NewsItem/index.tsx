import clsx from 'clsx';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { decodeText, shortAge } from '../../format';
import type { TickerItem } from '../../types';

export interface NewsItemProps {
  item: TickerItem;
  nowMs: number;
}

export function NewsItem({ item, nowMs }: NewsItemProps) {
  const href = safeExternalUrl(item.url) ?? undefined;
  const text = decodeText(item.headline) || '(untitled)';
  const className = clsx(CLASSES.newsItem, item.urgent && CLASSES.newsItemUrgent, href && CLASSES.newsItemClickable);
  const meta = (
    <span className={CLASSES.newsMeta}>
      <span className={CLASSES.newsSource}>{item.source || 'News'}</span>
      <span className={CLASSES.newsAge}>{shortAge(item.timestamp, nowMs)}</span>
      {href ? <span className={CLASSES.newsLink} aria-hidden="true">↗</span> : null}
    </span>
  );
  const title = <span className={CLASSES.newsTitle}>{text}</span>;
  return href
    ? <a className={className} href={href} target="_blank" rel="noopener noreferrer">{meta}{title}</a>
    : <div className={className}>{meta}{title}</div>;
}
