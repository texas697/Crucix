import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { CLASSES } from '../../classes';
import { asText, type Rec } from '../../coerce';
import { TONE_STYLES } from '../../styles';
import { STYLES } from '../MacroCard/styles';

export interface QuoteCardProps {
  quote: Rec;
}

function priceText(symbol: string, price: number | null): string {
  if (price == null) return '--';
  if (symbol.includes('BTC') || symbol.includes('ETH')) return `$${price.toLocaleString()}`;
  if (symbol.startsWith('^')) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `$${price}`;
}

export function QuoteCard({ quote: q }: QuoteCardProps) {
  const symbol = asText(q.symbol);
  const changePct = typeof q.changePct === 'number' ? q.changePct : null;
  const isUp = (changePct ?? 0) >= 0;
  const tone = isUp ? TONE_STYLES.accent : TONE_STYLES.warn;
  const price = typeof q.price === 'number' ? q.price : null;
  const changeText = changePct == null ? '--' : `${changePct >= 0 ? '+' : ''}${changePct}%`;
  return (
    <Paper className={CLASSES.macroCard} sx={STYLES.macroCard}>
      <Box className={CLASSES.macroLabel} sx={STYLES.macroLabel}>{asText(q.name) || symbol}</Box>
      <Box component="span" className={CLASSES.macroValue} sx={[STYLES.macroValue, tone]}>{priceText(symbol, price)}</Box>
      <Box component="span" className={CLASSES.macroSub} sx={[STYLES.macroSub, tone]}>
        {changePct == null ? changeText : <>{isUp ? '▲' : '▼'} {changeText}</>}
      </Box>
    </Paper>
  );
}
