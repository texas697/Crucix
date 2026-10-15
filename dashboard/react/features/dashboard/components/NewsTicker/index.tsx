import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import type { Translator } from '../../../../shared/locale';
import { decodeText } from '../../format';
import { makeLabel } from '../../label';
import type { TickerItem } from '../../types';
import { NewsItem } from '../NewsItem';
import { Panel } from '../Panel';
import { STYLES } from './styles';

export interface NewsTickerProps {
  items: TickerItem[];
  limit?: number;
  now?: () => number;
  t?: Translator;
}

function itemKey(item: TickerItem, index: number): string {
  return `${index}-${(decodeText(item.headline) || '(untitled)').slice(0, 24)}`;
}

export function NewsTicker({ items, limit = 20, now = Date.now, t }: NewsTickerProps) {
  const tr = makeLabel(t);
  const nowMs = now();
  const shown = items.slice(0, limit);
  return (
    <Panel id="pNews" title={tr('panels.newsTicker', 'Live news')} badge={`${shown.length} items`} isPadSm flex="2 1 420px">
      <Box className={CLASSES.newsList} sx={STYLES.newsList}>
        {shown.length === 0
          ? <Box className={CLASSES.newsEmpty} sx={STYLES.newsEmpty}>No recent headlines.</Box>
          : shown.map((item, i) => <NewsItem key={itemKey(item, i)} item={item} nowMs={nowMs} />)}
      </Box>
    </Panel>
  );
}
