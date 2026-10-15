import { useMemo } from 'react';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { num, str } from '../../coerce';
import type { MarketItem } from '../../types';

export interface MarketRowProps {
  market: MarketItem;
}

export function MarketRow({ market: p }: MarketRowProps) {
  const pct = Math.round(num(p.yes) * 100);
  const vol = num(p.vol);
  const volText = vol >= 1000 ? `${Math.round(vol / 1000)}k` : `${Math.round(vol)}`;
  const href = safeExternalUrl(`https://polymarket.com/event/${str(p.slug)}`) ?? undefined;
  const fill = useMemo(() => ({ width: `${Math.max(2, pct)}%` }), [pct]);
  return (
    <a className={CLASSES.marketItem} href={href} target="_blank" rel="noopener">
      <span className={CLASSES.marketQuestion}>{str(p.title)}</span>
      <span className={CLASSES.marketBar}><span className={CLASSES.marketBarFill} style={fill} /></span>
      <span className={CLASSES.marketMeta}><b className={CLASSES.marketPct}>{pct}%</b> yes {'·'} {'$'}{volText} 24h</span>
    </a>
  );
}
