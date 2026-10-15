import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { num, str } from '../../coerce';
import type { MarketItem } from '../../types';
import { STYLES, marketFillSx } from './styles';

export interface MarketRowProps {
  market: MarketItem;
}

export function MarketRow({ market: p }: MarketRowProps) {
  const pct = Math.round(num(p.yes) * 100);
  const vol = num(p.vol);
  const volText = vol >= 1000 ? `${Math.round(vol / 1000)}k` : `${Math.round(vol)}`;
  const href = safeExternalUrl(`https://polymarket.com/event/${str(p.slug)}`) ?? undefined;
  const fillSx = useMemo(() => marketFillSx(Math.max(2, pct)), [pct]);
  return (
    <Box component="a" className={CLASSES.marketItem} sx={STYLES.marketItem} href={href} target="_blank" rel="noopener">
      <Box component="span" className={CLASSES.marketQuestion} sx={STYLES.marketQuestion}>{str(p.title)}</Box>
      <Box component="span" className={CLASSES.marketBar} sx={STYLES.marketBar}>
        <Box component="span" className={CLASSES.marketBarFill} sx={fillSx} />
      </Box>
      <Box component="span" className={CLASSES.marketMeta} sx={STYLES.marketMeta}>
        <Box component="b" className={CLASSES.marketPct} sx={STYLES.marketPct}>{pct}%</Box> yes {'·'} {'$'}{volText} 24h
      </Box>
    </Box>
  );
}
