import { CLASSES } from '../../classes';
import { decodeText } from '../../format';
import type { TickerItem } from '../../types';
import { NewsItem } from '../NewsItem';
import { Panel } from '../Panel';

export interface NewsTickerProps {
  items: TickerItem[];
  limit?: number;
  now?: () => number;
}

function itemKey(item: TickerItem, index: number): string {
  return `${index}-${(decodeText(item.headline) || '(untitled)').slice(0, 24)}`;
}

export function NewsTicker({ items, limit = 20, now = Date.now }: NewsTickerProps) {
  const nowMs = now();
  const shown = items.slice(0, limit);
  return (
    <Panel id="pNews" title="Live news" badge={`${items.length} items`} isPadSm flex="2 1 420px">
      <div className={CLASSES.newsList}>
        {shown.length === 0
          ? <div className={CLASSES.newsEmpty}>No recent headlines.</div>
          : shown.map((item, i) => <NewsItem key={itemKey(item, i)} item={item} nowMs={nowMs} />)}
      </div>
    </Panel>
  );
}
