import { CLASSES } from '../../classes';
import { asText, type Rec } from '../../coerce';
import { STYLES } from '../../styles';

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
  const tone = isUp ? STYLES.accent : STYLES.warn;
  const price = typeof q.price === 'number' ? q.price : null;
  const changeText = changePct == null ? '--' : `${changePct >= 0 ? '+' : ''}${changePct}%`;
  return (
    <div className={CLASSES.macroCard}>
      <div className={CLASSES.macroLabel}>{asText(q.name) || symbol}</div>
      <span className={CLASSES.macroValue} style={tone}>{priceText(symbol, price)}</span>
      <span className={CLASSES.macroSub} style={tone}>
        {changePct == null ? changeText : <>{isUp ? '▲' : '▼'} {changeText}</>}
      </span>
    </div>
  );
}
