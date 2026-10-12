// FRED — Federal Reserve Economic Data
// 840,000+ time series. Works without a key via the public graph CSV; a free API key uses the JSON API instead.
// Key indicators: yield curve, CPI, unemployment, money supply, GDP, fed funds rate

import { safeFetch, today, daysAgo } from '../utils/fetch.mjs';

const BASE = 'https://api.stlouisfed.org/fred';

// Key series IDs for macro intelligence
const KEY_SERIES = {
  // Yield curve & rates
  DFF: 'Fed Funds Rate',
  DGS2: '2-Year Treasury Yield',
  DGS10: '10-Year Treasury Yield',
  DGS30: '30-Year Treasury Yield',
  T10Y2Y: '10Y-2Y Spread (Yield Curve)',
  T10Y3M: '10Y-3M Spread',
  // Inflation
  CPIAUCSL: 'CPI All Items',
  CPILFESL: 'Core CPI (ex Food & Energy)',
  PCEPI: 'PCE Price Index',
  MICH: 'Michigan Inflation Expectations',
  // Labor
  UNRATE: 'Unemployment Rate',
  PAYEMS: 'Nonfarm Payrolls',
  ICSA: 'Initial Jobless Claims',
  // Money & credit
  M2SL: 'M2 Money Supply',
  WALCL: 'Fed Balance Sheet Total Assets',
  // Fear gauges
  VIXCLS: 'VIX (Fear Index)',
  BAMLH0A0HYM2: 'High Yield Spread (Credit Stress)',
  // Commodities via FRED
  DCOILWTICO: 'WTI Crude Oil',
  // GOLDAMGBD228NLBM (London gold fix) was discontinued on FRED; metals come from Yahoo Finance instead.
  // Housing
  MORTGAGE30US: '30-Year Mortgage Rate',
  // Global
  DTWEXBGS: 'USD Trade Weighted Index',
};

// Get latest value for a series through the keyed JSON API
async function getSeriesLatest(seriesId, apiKey) {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc',
    limit: '5',
    observation_start: daysAgo(90),
  });
  return safeFetch(`${BASE}/series/observations?${params}`);
}

// Keyless fallback: the public graph CSV behind every FRED chart (date,value per line, "." for missing days).
// It carries the same observations as the API, so the dashboard works without a FRED_API_KEY.
const GRAPH_CSV = 'https://fred.stlouisfed.org/graph/fredgraph.csv';
const CSV_HEADERS = { 'User-Agent': 'Crucix/2.0 (MFB Services Intelligence dashboard; +https://crucix-intel-41718.firebaseapp.com)' };

async function getSeriesCsv(seriesId) {
  const data = await safeFetch(`${GRAPH_CSV}?id=${seriesId}&cosd=${daysAgo(120)}`, { headers: CSV_HEADERS, timeout: 12000, maxText: 20000 });
  const text = typeof data?.rawText === 'string' ? data.rawText : null;
  if (!text) return { error: data?.error || 'no csv' };
  const rows = text.trim().split('\n').slice(1)
    .map(line => line.split(','))
    .filter(([date, value]) => date && value && value.trim() !== '.' && Number.isFinite(parseFloat(value)))
    .map(([date, value]) => ({ date: date.trim(), value: value.trim() }))
    .reverse(); // newest first, matching sort_order=desc
  return { observations: rows.slice(0, 5) };
}

function toIndicator(id, label, data) {
  const obs = data?.observations;
  if (!obs?.length) return { id, label, value: null, date: null, recent: [] };
  const latest = obs.find(o => o.value !== '.');
  const validObs = obs.filter(o => o.value !== '.');
  return {
    id,
    label,
    value: latest ? parseFloat(latest.value) : null,
    date: latest?.date || null,
    recent: validObs.slice(0, 5).map(o => parseFloat(o.value)),
  };
}

// Briefing — pull all key indicators
export async function briefing(apiKey) {
  const entries = Object.entries(KEY_SERIES);
  const access = apiKey ? 'api' : 'graph-csv';
  const results = await Promise.all(
    entries.map(async ([id, label]) => {
      let data = apiKey ? await getSeriesLatest(id, apiKey) : null;
      if (!data?.observations?.length) data = await getSeriesCsv(id);
      return toIndicator(id, label, data);
    })
  );

  // Compute derived signals
  const get = (id) => results.find(r => r.id === id)?.value;
  const yieldCurve10y2y = get('T10Y2Y');
  const yieldCurve10y3m = get('T10Y3M');
  const vix = get('VIXCLS');
  const hySpread = get('BAMLH0A0HYM2');

  const signals = [];
  if (yieldCurve10y2y !== null && yieldCurve10y2y < 0) signals.push('YIELD CURVE INVERTED (10Y-2Y) — recession signal');
  if (yieldCurve10y3m !== null && yieldCurve10y3m < 0) signals.push('YIELD CURVE INVERTED (10Y-3M) — stronger recession signal');
  if (vix !== null && vix > 30) signals.push(`VIX ELEVATED at ${vix} — high fear/volatility`);
  if (vix !== null && vix > 40) signals.push(`VIX EXTREME at ${vix} — crisis-level fear`);
  if (hySpread !== null && hySpread > 5) signals.push(`HIGH YIELD SPREAD WIDE at ${hySpread}% — credit stress`);

  const indicators = results.filter(r => r.value !== null);
  return {
    source: 'FRED',
    timestamp: new Date().toISOString(),
    access,
    ...(apiKey ? {} : { note: 'No FRED_API_KEY set; observations read from the public graph CSV endpoint.' }),
    indicators,
    missing: results.filter(r => r.value === null).map(r => r.id),
    ...(indicators.length === 0 ? { error: 'FRED returned no observations' } : {}),
    signals,
  };
}

if (process.argv[1]?.endsWith('fred.mjs')) {
  const data = await briefing(process.env.FRED_API_KEY);
  console.log(JSON.stringify(data, null, 2));
}
