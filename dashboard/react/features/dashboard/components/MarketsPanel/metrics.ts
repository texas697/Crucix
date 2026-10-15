import type { SweepData } from '../../../../api/types';
import { asArr, asNumArr, asRec, asText, num, type Rec } from '../../coerce';

export interface MacroMetric {
  l: string;
  v: string;
  s: string;
  p: number;
  spark?: number[];
  sparkUp?: boolean;
}

export interface MarketsView {
  isLive: boolean;
  metrics: MacroMetric[];
  indexes: Rec[];
  crypto: Rec[];
  wtiRecent: number[];
}

function fmtMarketPrice(price: unknown): string {
  const n = typeof price === 'number' ? price : null;
  return n != null ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '--';
}

function dayMove(pct: unknown): string {
  const n = typeof pct === 'number' ? pct : null;
  return n != null ? `${n >= 0 ? '+' : ''}${n}% today` : '';
}

function energyPrice(value: unknown): string {
  return typeof value === 'number' ? `$${value}` : '--';
}

function vixMetric(mkt: Rec, fred: Rec[]): MacroMetric {
  const vixObj = mkt.vix && typeof mkt.vix === 'object' && !Array.isArray(mkt.vix) ? (mkt.vix as Rec) : null;
  const vixFred = fred.find((f) => f.id === 'VIXCLS');
  const vixVal = (vixObj ? vixObj.value : undefined) || (vixFred ? vixFred.value : undefined);
  const changePct = vixObj ? vixObj.changePct : undefined;
  const vixChg = changePct != null ? `${num(changePct) >= 0 ? '+' : ''}${changePct}%` : '';
  return {
    l: 'VIX',
    v: vixVal != null ? num(vixVal).toFixed(1) : '--',
    s: vixChg || 'volatility index',
    p: vixVal != null ? Math.min(num(vixVal) * 2.5, 100) : 30,
  };
}

export function marketsView(data: SweepData): MarketsView {
  const mkt = asRec(data.markets);
  const metals = asRec(data.metals);
  const energy = asRec(data.energy);
  const fred = asArr(data.fred);
  const bls = asArr(data.bls);
  const gscpi = data.gscpi && typeof data.gscpi === 'object' && !Array.isArray(data.gscpi) ? (data.gscpi as Rec) : null;
  const ff = fred.find((f) => f.id === 'DFF');
  const ue = bls.find((b) => b.id === 'LNS14000000');
  const cpi = bls.find((b) => b.id === 'CUUR0000SA0');
  const wtiRecent = asNumArr(energy.wtiRecent);
  const metrics: MacroMetric[] = [
    { l: 'WTI Crude', v: energyPrice(energy.wti), s: '$/bbl', p: 70, spark: wtiRecent, sparkUp: false },
    { l: 'Brent', v: energyPrice(energy.brent), s: '$/bbl', p: 75 },
    { l: 'Nat Gas', v: energyPrice(energy.natgas), s: '$/MMBtu', p: 30 },
    { l: 'Gold', v: fmtMarketPrice(metals.gold), s: dayMove(metals.goldChangePct) || 'COMEX proxy', p: 58, spark: asNumArr(metals.goldRecent), sparkUp: num(metals.goldChangePct, 0) >= 0 },
    { l: 'Silver', v: fmtMarketPrice(metals.silver), s: dayMove(metals.silverChangePct) || 'COMEX proxy', p: 54, spark: asNumArr(metals.silverRecent), sparkUp: num(metals.silverChangePct, 0) >= 0 },
    vixMetric(mkt, fred),
    { l: 'Fed Funds', v: ff ? `${ff.value}%` : '--', s: ff ? asText(ff.date) : '', p: 36 },
    { l: 'GSCPI', v: gscpi ? num(gscpi.value).toFixed(2) : '--', s: gscpi ? asText(gscpi.interpretation) : '', p: 49 },
    { l: 'CPI MoM', v: cpi ? `+${num(cpi.momChangePct).toFixed(2)}%` : '--', s: cpi ? asText(cpi.date) : '', p: 37 },
    { l: 'Unemployment', v: ue ? `${ue.value}%` : '--', s: ue ? `${num(ue.momChange) > 0 ? '+' : ''}${ue.momChange} vs prior` : '', p: 44 },
  ];
  const isQuote = (q: Rec) => !!q && !q.error;
  return {
    isLive: !!mkt.timestamp,
    metrics,
    indexes: asArr(mkt.indexes).filter(isQuote),
    crypto: asArr(mkt.crypto).filter(isQuote),
    wtiRecent,
  };
}
