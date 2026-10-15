import type { CSSProperties } from 'react';
import type { SweepData } from '../../../../api/types';
import { asArr, asRec, num, str } from '../../coerce';
import type { Label } from '../../label';
import { STYLES } from '../../styles';

export interface RiskMetric {
  key: string;
  label: string;
  value: string;
  title?: string;
  valueStyle?: CSSProperties;
}

export interface RiskGaugeView {
  badge: string;
  metrics: RiskMetric[];
}

const INHERIT: CSSProperties = { color: 'inherit' };

export function riskGaugeView(data: SweepData, tr: Label): RiskGaugeView {
  const fred = asArr(data.fred);
  const fredById = (id: string) => fred.find((f) => f.id === id);
  const vix = fredById('VIXCLS');
  const hy = fredById('BAMLH0A0HYM2');
  const usd = fredById('DTWEXBGS');
  const m2 = fredById('M2SL');
  const mort = fredById('MORTGAGE30US');
  const claims = fredById('ICSA');
  const fredAsOf = [vix, hy, usd, claims, mort].map((f) => str(f?.date)).filter(Boolean).sort().pop();
  const vixVal = vix?.value;
  const hyVal = hy?.value;
  const m2Raw = m2?.value != null ? Number(m2.value) : null;
  const debtNum = Number.parseFloat(str(asRec(data.treasury).totalDebt));
  return {
    badge: fredAsOf ? `FRED · ${fredAsOf.slice(5).replace('-', '/')}` : 'Stress',
    metrics: [
      {
        key: 'vix', label: tr('metrics.vix', 'VIX'), value: vixVal != null && vixVal !== 0 ? String(vixVal) : '--',
        title: vix && str(vix.date) ? `CBOE VIX close ${str(vix.date)}` : undefined,
        valueStyle: num(vixVal) > 20 ? STYLES.warn : STYLES.accent,
      },
      {
        key: 'hy', label: tr('metrics.hySpread', 'HY spread'), value: hyVal != null ? `${Number(hyVal).toFixed(2)}%` : '--',
        title: hy && str(hy.date) ? `ICE BofA US High Yield option-adjusted spread ${str(hy.date)}` : undefined,
        valueStyle: num(hyVal) > 5 ? STYLES.warn : INHERIT,
      },
      { key: 'usd', label: tr('metrics.usdIndex', 'USD index'), value: usd?.value != null ? Number(usd.value).toFixed(1) : '--' },
      { key: 'claims', label: tr('metrics.joblessClaims', 'Jobless claims'), value: claims?.value != null ? Number(claims.value).toLocaleString() : '--' },
      { key: 'mort', label: tr('metrics.mortgage30y', '30Y mortgage'), value: `${mort?.value ? String(mort.value) : '--'}%` },
      { key: 'm2', label: tr('metrics.m2Supply', 'M2 supply'), value: m2Raw != null && Number.isFinite(m2Raw) ? `$${(m2Raw / 1000).toFixed(1)}T` : '--' },
      { key: 'debt', label: tr('metrics.natDebt', 'Nat. debt'), value: Number.isFinite(debtNum) ? `$${(debtNum / 1e12).toFixed(2)}T` : '--' },
    ],
  };
}
