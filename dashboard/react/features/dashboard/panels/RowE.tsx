import type { ReactNode } from 'react';
import type { SweepData } from '../../../api/types';
import type { Translator } from '../../../shared/locale';
import { Panel } from '../Panel';

// Row E, ported from renderLower() in jarvis.html (2272-2418, the markets block 2399-2418 that builds
// MACRO_INNER/MACRO_LIVE) plus renderRight() 2697 (which places MACRO_INNER into the pMarkets card with
// the Live/Delayed badge). One full-width card (flex 1 1 100%) keeps the legacy id so the ported CSS
// keeps applying:
//
//   INDEXES                     live Yahoo index quotes (markets.indexes)
//   CRYPTO                      live Yahoo crypto quotes (markets.crypto)
//   ENERGY + METALS + MACRO     energy prices, metals, FRED/BLS/GSCPI macro metrics
//   WTI 5-DAY                   sparkline of energy.wtiRecent
//
// Everything is rendered as React nodes; React escapes untrusted feed strings, so no innerHTML anywhere.
// The data fields stay loosely typed (SweepData mirrors the synthesized envelope deliberately loosely)
// and are coerced at the edges. Labels go through the shared Translator with the legacy dotted keys and
// English fallbacks; the section captions are hardcoded in the legacy and stay hardcoded here.

type Rec = Record<string, unknown>;
type Label = (key: string, fallback?: string) => string;

export interface MarketsPanelProps {
  data: SweepData;
  t?: Translator;
}

/** Props for the RowE group wrapper (identical to the single card it returns). */
export interface RowEProps extends MarketsPanelProps {}

/** Coerce a loose record field to an object, or an empty one. */
function asRec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {};
}

/** Coerce a loose record field to an array of records. */
function asArr(value: unknown): Rec[] {
  return Array.isArray(value) ? (value as Rec[]) : [];
}

/** Coerce to a finite number, falling back to `d`. */
function num(value: unknown, d = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : d;
}

/** Coerce to a string, or ''. */
function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** Only call `t.has` when the translator actually exposes it (mirrors LeftRail/RowB/RowC). */
function hasKey(t: Translator | undefined, key: string): boolean {
  return !!t && typeof t.has === 'function' ? t.has(key) : false;
}

/** Build the legacy `t(key, fallback)` label lookup. */
function makeLabel(t: Translator | undefined): Label {
  return (key, fallback) => (hasKey(t, key) ? t!(key) : (fallback ?? key));
}

/** Coerce a loose `recent` series to a finite number array. */
function asNumArr(value: unknown): number[] {
  return Array.isArray(value) ? (value as unknown[]).map((v) => num(v)) : [];
}

/** The shared section caption style (legacy inline, e.g. "INDEXES" jarvis.html 2400). */
const SECTION_STYLE = {
  fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)', marginBottom: 4, letterSpacing: 1,
} as const;
const WTI_HEAD_STYLE = {
  fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', marginBottom: 4,
} as const;

export function RowE({ data, t }: RowEProps) {
  return <MarketsPanel data={data} t={t} />;
}

export function MarketsPanel({ data, t }: MarketsPanelProps) {
  const tr = makeLabel(t);

  const mkt = asRec(data.markets);
  const metals = asRec(data.metals);
  const energy = asRec(data.energy);
  const fred = asArr(data.fred);
  const bls = asArr(data.bls);
  const gscpi = data.gscpi && typeof data.gscpi === 'object' && !Array.isArray(data.gscpi)
    ? (data.gscpi as Rec)
    : null;

  // Legacy MACRO_LIVE == !!mkt.timestamp (jarvis.html 2418).
  const live = !!mkt.timestamp;

  // FRED / BLS series the legacy pulls by id (2274-2279).
  const ff = fred.find((f) => f.id === 'DFF');
  const ue = bls.find((b) => b.id === 'LNS14000000');
  const cpi = bls.find((b) => b.id === 'CUUR0000SA0');

  // VIX comes from the live Yahoo quote, falling back to FRED VIXCLS (2306-2309).
  const vixObj = mkt.vix && typeof mkt.vix === 'object' && !Array.isArray(mkt.vix) ? (mkt.vix as Rec) : null;
  const vixLiveValue = vixObj ? vixObj.value : undefined;
  const vixLiveChangePct = vixObj ? vixObj.changePct : undefined;
  const vixFred = fred.find((f) => f.id === 'VIXCLS');
  const vixVal = vixLiveValue || (vixFred ? vixFred.value : undefined);
  const vixChg = vixLiveChangePct != null
    ? `${num(vixLiveChangePct) >= 0 ? '+' : ''}${vixLiveChangePct}%`
    : '';

  const fmtMarketPrice = (price: unknown): string => {
    const n = typeof price === 'number' ? price : null;
    return n != null ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '--';
  };
  const dayMove = (pct: unknown): string => {
    const n = typeof pct === 'number' ? pct : null;
    return n != null ? `${n >= 0 ? '+' : ''}${n}% today` : '';
  };

  const wti = typeof energy.wti === 'number' ? energy.wti : null;
  const brent = typeof energy.brent === 'number' ? energy.brent : null;
  const natgas = typeof energy.natgas === 'number' ? energy.natgas : null;

  interface Metric {
    l: string;
    v: string;
    s: string;
    p: number;
    spark?: number[];
    sparkUp?: boolean;
  }

  const metrics: Metric[] = [
    { l: 'WTI Crude', v: wti != null ? `$${wti}` : '--', s: '$/bbl', p: 70 },
    { l: 'Brent', v: brent != null ? `$${brent}` : '--', s: '$/bbl', p: 75 },
    { l: 'Nat Gas', v: natgas != null ? `$${natgas}` : '--', s: '$/MMBtu', p: 30 },
    { l: 'Gold', v: fmtMarketPrice(metals.gold), s: dayMove(metals.goldChangePct) || 'COMEX proxy', p: 58 },
    { l: 'Silver', v: fmtMarketPrice(metals.silver), s: dayMove(metals.silverChangePct) || 'COMEX proxy', p: 54 },
    {
      l: 'VIX',
      v: vixVal != null ? num(vixVal).toFixed(1) : '--',
      s: vixChg || 'volatility index',
      p: vixVal != null ? Math.min(num(vixVal) * 2.5, 100) : 30,
    },
    { l: 'Fed Funds', v: ff ? `${ff.value}%` : '--', s: ff ? str(ff.date) : '', p: 36 },
    { l: 'GSCPI', v: gscpi ? num(gscpi.value).toFixed(2) : '--', s: gscpi ? str(gscpi.interpretation) : '', p: 49 },
    { l: 'CPI MoM', v: cpi ? `+${num(cpi.momChangePct).toFixed(2)}%` : '--', s: cpi ? str(cpi.date) : '', p: 37 },
    {
      l: 'Unemployment',
      v: ue ? `${ue.value}%` : '--',
      s: ue ? `${num(ue.momChange) > 0 ? '+' : ''}${ue.momChange} vs prior` : '',
      p: 44,
    },
  ];

  // Attach the FRED/metals sparklines the legacy overlays on the WTI/gold/silver metric cards (2331-2333).
  const wtiRecent = asNumArr(energy.wtiRecent);
  const goldRecent = asNumArr(metals.goldRecent);
  const silverRecent = asNumArr(metals.silverRecent);
  metrics[0] = { ...metrics[0]!, spark: wtiRecent, sparkUp: false };
  metrics[3] = { ...metrics[3]!, spark: goldRecent, sparkUp: num(metals.goldChangePct, 0) >= 0 };
  metrics[4] = { ...metrics[4]!, spark: silverRecent, sparkUp: num(metals.silverChangePct, 0) >= 0 };

  // Live Yahoo cards (legacy indexCards / cryptoCards, 2336-2339). Cards with an error are dropped.
  const indexCards = asArr(mkt.indexes).map((q, i) => mktCard(q, `idx-${i}`)).filter((n) => n !== null);
  const cryptoCards = asArr(mkt.crypto).map((q, i) => mktCard(q, `cry-${i}`)).filter((n) => n !== null);
  const hasMarkets = indexCards.length > 0 || cryptoCards.length > 0;

  return (
    <Panel
      id="pMarkets"
      title={tr('panels.macroMarkets', 'Macro + markets')}
      badge={live ? 'Live' : 'Delayed'}
      flex="1 1 100%"
    >
      {hasMarkets ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={SECTION_STYLE}>INDEXES</div>
            <div className="metrics-row">{indexCards}</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={SECTION_STYLE}>CRYPTO</div>
            <div className="metrics-row">{cryptoCards}</div>
          </div>
        </>
      ) : null}

      <div style={{ marginBottom: 8 }}>
        <div style={SECTION_STYLE}>ENERGY + METALS + MACRO</div>
        <div className="metrics-row">
          {metrics.map((m, i) => (
            <div className="mc" key={`${m.l}-${i}`}>
              <div className="ml">{m.l}</div>
              <span className="mv">
                {m.v}
                {m.spark ? <SparkSvg values={m.spark} isGood={!!m.sparkUp} /> : null}
              </span>
              <span className="ms">{m.s}</span>
              <div className="mbar">
                <span style={{ width: `${m.p}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        <div style={WTI_HEAD_STYLE}>WTI 5-DAY</div>
        <div className="spark">
          <SparkSvg values={wtiRecent} isGood={false} />
        </div>
      </div>
    </Panel>
  );
}

/**
 * One live market quote card, legacy `mktCard` (jarvis.html 2291-2303). Crypto prices get a grouped
 * `$64,000`; index prices drop the sign and use up to 2 decimals (`5,800`); everything else echoes the
 * raw price (`$4.1`). Missing prices/changes degrade to `--` rather than printing NaN/undefined.
 */
function mktCard(q: Rec, key: string): ReactNode {
  if (!q || q.error) return null;
  const symbol = str(q.symbol);
  const changePct = typeof q.changePct === 'number' ? q.changePct : null;
  const up = (changePct ?? 0) >= 0;
  const clr = up ? 'var(--accent)' : 'var(--warn)';
  const arrow = up ? '\u25b2' : '\u25bc';
  const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
  const isIndex = symbol.startsWith('^');
  const price = typeof q.price === 'number' ? q.price : null;
  const priceText = price == null
    ? '--'
    : isCrypto
      ? `$${price.toLocaleString()}`
      : isIndex
        ? price.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : `$${price}`;
  const changeText = changePct == null ? '--' : `${changePct >= 0 ? '+' : ''}${changePct}%`;

  return (
    <div className="mc" key={key}>
      <div className="ml">{str(q.name) || symbol}</div>
      <span className="mv" style={{ color: clr }}>{priceText}</span>
      <span className="ms" style={{ color: clr }}>
        {changePct == null ? changeText : <>{arrow} {changeText}</>}
      </span>
    </div>
  );
}

/**
 * Inline sparkline, legacy `mkSparkSvg` (jarvis.html 2256-2269). Ports the normalise-into-the-viewBox
 * point math and the `spark-good`/`spark-bad` class pair; returns nothing for fewer than two points.
 */
function SparkSvg({ values, isGood }: { values: number[]; isGood: boolean }): ReactNode {
  if (!values || values.length < 2) return null;
  const w = 52, h = 18, pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + ((max - v) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const cls = isGood ? 'spark-good' : 'spark-bad';
  const [lastX, lastY] = pts[pts.length - 1]!.split(',');

  return (
    <svg className="spark-svg" viewBox={`0 0 ${w} ${h}`}>
      <polyline className={`spark-line ${cls}`} points={pts.join(' ')} />
      <circle
        className={`${cls} spark-dot`}
        cx={lastX}
        cy={lastY}
        r={2}
        fill={isGood ? 'var(--accent)' : 'var(--danger)'}
      />
    </svg>
  );
}
