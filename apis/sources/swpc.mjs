// NOAA SWPC — Space Weather Prediction Center.
// No auth required. Three small JSON products: the planetary Kp index (3-hourly), the latest GOES X-ray flare, and
// the NOAA R/S/G scales (radio blackout, solar radiation storm, geomagnetic storm) for now and the next three days,
// plus the alert/watch/warning text feed. Geomagnetic storms degrade HF radio and GPS, which is why this sits
// alongside the SDR and jamming layers rather than being a curiosity.

import { safeFetch } from '../utils/fetch.mjs';

const BASE = 'https://services.swpc.noaa.gov';
const TIMEOUT_MS = 15000;

const KP_LABEL = k => k >= 9 ? 'G5 extreme' : k >= 8 ? 'G4 severe' : k >= 7 ? 'G3 strong' : k >= 6 ? 'G2 moderate' : k >= 5 ? 'G1 minor' : k >= 4 ? 'active' : k >= 3 ? 'unsettled' : 'quiet';
const FLARE_RANK = { A: 0, B: 1, C: 2, M: 3, X: 4 };
const flareRank = c => c ? (FLARE_RANK[c[0]] ?? -1) * 10 + Math.min(9.9, parseFloat(c.slice(1)) || 0) : -1;

function parseAlert(a) {
  const msg = String(a.message || '');
  const line = msg.split(/\r?\n/).find(l => /^(ALERT|WATCH|WARNING|SUMMARY|EXTENDED WARNING|CANCEL)/i.test(l.trim())) || '';
  return { code: a.product_id, issued: a.issue_datetime ? new Date(a.issue_datetime.replace(' ', 'T') + 'Z').toISOString() : null, title: line.trim().slice(0, 140) };
}

export async function briefing() {
  const started = Date.now();
  const [kp, flare, scales, alerts] = await Promise.all([
    safeFetch(`${BASE}/products/noaa-planetary-k-index.json`, { timeout: TIMEOUT_MS }),
    safeFetch(`${BASE}/json/goes/primary/xray-flares-latest.json`, { timeout: TIMEOUT_MS }),
    safeFetch(`${BASE}/products/noaa-scales.json`, { timeout: TIMEOUT_MS }),
    safeFetch(`${BASE}/products/alerts.json`, { timeout: TIMEOUT_MS }),
  ]);
  const errors = [];
  const kpRows = Array.isArray(kp) ? kp.filter(r => r && r.Kp != null) : (errors.push(`Kp: ${kp?.error || 'bad response'}`), []);
  const last24 = kpRows.slice(-8), last72 = kpRows.slice(-24);
  const kpNow = last24.at(-1) || null;
  const kpOut = kpNow ? {
    now: +kpNow.Kp, time: kpNow.time_tag.endsWith('Z') ? kpNow.time_tag : kpNow.time_tag + 'Z', label: KP_LABEL(+kpNow.Kp),
    max24: Math.max(...last24.map(r => +r.Kp)), max72: Math.max(...last72.map(r => +r.Kp)),
    series: last24.map(r => +r.Kp),
  } : null;

  const f = Array.isArray(flare) ? flare[0] : null;
  if (!f) errors.push(`flares: ${flare?.error || 'bad response'}`);
  const flareOut = f ? {
    current: f.current_class || null, time: f.time_tag || null,
    max: f.max_class || null, maxTime: f.max_time || null, begin: f.begin_time || null,
  } : null;

  const sc = scales && typeof scales === 'object' && scales['0'] ? scales : (errors.push(`scales: ${scales?.error || 'bad response'}`), null);
  const day = d => d ? { R: d.R?.Scale != null ? +d.R.Scale : null, S: d.S?.Scale != null ? +d.S.Scale : null, G: d.G?.Scale != null ? +d.G.Scale : null, text: { R: d.R?.Text, S: d.S?.Text, G: d.G?.Text }, prob: { Rminor: d.R?.MinorProb ?? null, Rmajor: d.R?.MajorProb ?? null, S: d.S?.Prob ?? null }, date: d.DateStamp } : null;
  const scalesOut = sc ? { now: day(sc['0']), past24: day(sc['-1']), forecast: [day(sc['1']), day(sc['2']), day(sc['3'])].filter(Boolean) } : null;

  const alertList = Array.isArray(alerts) ? alerts.map(parseAlert).filter(a => a.title).slice(0, 8) : [];

  const signals = [];
  const g = scalesOut?.now?.G || 0, r = scalesOut?.now?.R || 0, s = scalesOut?.now?.S || 0;
  if (g >= 1) signals.push(`GEOMAGNETIC STORM G${g} in progress (${scalesOut.now.text.G}) — HF radio and GPS degraded at high latitudes`);
  if (r >= 1) signals.push(`RADIO BLACKOUT R${r} (${scalesOut.now.text.R}) — HF loss on the sunlit side`);
  if (s >= 1) signals.push(`SOLAR RADIATION STORM S${s} (${scalesOut.now.text.S})`);
  const fc = scalesOut?.forecast?.find(d => (d.G || 0) >= 1 || (d.R || 0) >= 1);
  if (!g && fc) signals.push(`Storm watch: ${fc.G ? `G${fc.G}` : ''}${fc.G && fc.R ? '/' : ''}${fc.R ? `R${fc.R}` : ''} expected ${fc.date}`);
  if (flareOut?.max && flareRank(flareOut.max) >= flareRank('M1')) signals.push(`${flareOut.max} solar flare peaked ${flareOut.maxTime || ''}`.trim());
  if (kpOut) signals.push(`Kp ${kpOut.now.toFixed(1)} (${kpOut.label}), 24h max ${kpOut.max24.toFixed(1)}; X-ray ${flareOut?.current || 'n/a'}`);

  return {
    source: 'SWPC', timestamp: new Date().toISOString(),
    kp: kpOut, flare: flareOut, scales: scalesOut, alerts: alertList,
    error: errors.length === 3 ? errors.join('; ') : null, partial: errors.length ? errors : null,
    signals, durationMs: Date.now() - started,
  };
}

if (process.argv[1]?.endsWith('swpc.mjs')) {
  console.log(JSON.stringify(await briefing(), null, 2));
}
