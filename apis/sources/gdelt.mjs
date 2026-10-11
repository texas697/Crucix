// GDELT — Global Database of Events, Language, and Tone
// No auth required. Two feeds are used:
//   1. DOC 2.0 API (api.gdeltproject.org) — headline search over the last 24h. Rate limited per IP
//      (one request every 5 s, shared across everyone behind that IP) so it is called exactly once
//      and treated as best-effort.
//   2. Raw 15-minute event exports (data.gdeltproject.org/gdeltv2/<stamp>.export.CSV.zip) — static
//      files, no rate limit, ~50 KB each, every event geocoded + CAMEO coded. This is what feeds the
//      map's conflict layer. The old GEO 2.0 API has been retired upstream (404).

import { inflateRawSync } from 'node:zlib';
import { safeFetch } from '../utils/fetch.mjs';

const DOC = 'https://api.gdeltproject.org/api/v2/doc/doc';
const EXPORT = 'https://data.gdeltproject.org/gdeltv2';
const WINDOW_HOURS = Math.max(1, Math.min(24, Number(process.env.GDELT_WINDOW_HOURS) || 6));
const FILE_TIMEOUT_MS = 12000;
const EXPORT_BUDGET_MS = 24000;   // stay under the 30 s per-source cap in briefing.mjs
const DOC_TIMEOUT_MS = 15000;
const CONCURRENCY = 6;
const MAX_CLUSTERS = 80;

// GDELT 2.0 event export columns (0-based, tab separated, 61 columns, no header row)
const C = {
  id: 0, day: 1, actor1: 6, actor2: 16, code: 26, root: 28, quad: 29, goldstein: 30,
  mentions: 31, sources: 32, articles: 33, tone: 34,
  place: 52, countryCode: 53, lat: 56, lon: 57, added: 59, url: 60,
};

// CAMEO root codes we plot as "conflict". 14 is QuadClass 3 (verbal), 15/17–20 are material conflict.
const CONFLICT_ROOTS = {
  14: 'Protest',
  15: 'Force posture',
  17: 'Coercion',
  18: 'Assault',
  19: 'Armed clash',
  20: 'Mass violence',
};

const SEVERITY = { 'Mass violence': 6, 'Armed clash': 5, Assault: 4, Coercion: 3, 'Force posture': 2, Protest: 1 };

// ---------- DOC API (headlines) ----------

export async function searchEvents(query = '', opts = {}) {
  const {
    mode = 'ArtList', maxRecords = 75, timespan = '24h', format = 'json', sortBy = 'DateDesc',
  } = opts;
  const q = query || 'conflict OR crisis OR military OR sanctions OR war OR economy';
  const params = new URLSearchParams({ query: q, mode, maxrecords: String(maxRecords), timespan, format, sort: sortBy });
  const res = await safeFetch(`${DOC}?${params}`, { timeout: DOC_TIMEOUT_MS, retries: 0 });
  // The rate limiter answers HTTP 200 with a plain-text notice instead of JSON
  if (res?.rawText && /limit requests|rate limit/i.test(res.rawText)) {
    return { error: 'GDELT DOC API rate limited (shared IP)', rateLimited: true };
  }
  return res;
}

export async function toneTrend(query, timespan = '7d') {
  const params = new URLSearchParams({ query, mode: 'TimelineTone', timespan, format: 'json' });
  return safeFetch(`${DOC}?${params}`, { timeout: DOC_TIMEOUT_MS, retries: 0 });
}

export async function volumeTrend(query, timespan = '7d') {
  const params = new URLSearchParams({ query, mode: 'TimelineVol', timespan, format: 'json' });
  return safeFetch(`${DOC}?${params}`, { timeout: DOC_TIMEOUT_MS, retries: 0 });
}

function compactArticle(a) {
  return { title: a.title, url: a.url, date: a.seendate, domain: a.domain, language: a.language, country: a.sourcecountry };
}

// ---------- Event export (geolocated events) ----------

/** Extract the single CSV inside a GDELT export zip without any zip dependency. */
function unzipSingle(buf) {
  // End-of-central-directory record is in the last 64 KB
  const tail = Math.max(0, buf.length - 65557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= tail; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip (no EOCD)');
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (buf.readUInt32LE(cdOffset) !== 0x02014b50) throw new Error('bad central directory');
  const method = buf.readUInt16LE(cdOffset + 10);
  const csize = buf.readUInt32LE(cdOffset + 20);
  const localOffset = buf.readUInt32LE(cdOffset + 42);
  if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('bad local header');
  const nameLen = buf.readUInt16LE(localOffset + 26);
  const extraLen = buf.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + csize);
  if (method === 8) return inflateRawSync(data);
  if (method === 0) return Buffer.from(data);
  throw new Error(`unsupported zip method ${method}`);
}

function stamp(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}00`;
}

/** Newest export stamp from lastupdate.txt, falling back to the previous 15-minute boundary. */
async function latestStamp() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FILE_TIMEOUT_MS);
    const res = await fetch(`${EXPORT}/lastupdate.txt`, { signal: ctrl.signal, headers: { 'User-Agent': 'Crucix/2.0' } });
    clearTimeout(t);
    const m = (await res.text()).match(/(\d{14})\.export\.CSV\.zip/);
    if (m) return m[1];
  } catch { /* fall through */ }
  const d = new Date(Date.now() - 15 * 60000);
  d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 15) * 15, 0, 0);
  return stamp(d);
}

function stampsBack(latest, count) {
  const y = +latest.slice(0, 4), mo = +latest.slice(4, 6) - 1, da = +latest.slice(6, 8), h = +latest.slice(8, 10), mi = +latest.slice(10, 12);
  const base = Date.UTC(y, mo, da, h, mi);
  return Array.from({ length: count }, (_, i) => stamp(new Date(base - i * 15 * 60000)));
}

function stampToIso(s) {
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`;
}

async function fetchExport(st) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FILE_TIMEOUT_MS);
  try {
    const res = await fetch(`${EXPORT}/${st}.export.CSV.zip`, { signal: ctrl.signal, headers: { 'User-Agent': 'Crucix/2.0' } });
    if (!res.ok) return { stamp: st, missing: true, status: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    return { stamp: st, text: unzipSingle(buf).toString('utf8') };
  } catch (e) {
    return { stamp: st, missing: true, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

function cleanActor(s) {
  if (!s) return '';
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/** GDELT replaces non-ASCII characters in place names with '?' (e.g. "Ar Riya?"); drop those segments. */
function cleanPlace(place) {
  const parts = String(place || '').split(',').map(p => p.trim());
  const kept = parts.filter((p, i) => i === 0 || i === parts.length - 1 || !p.includes('?'));
  return kept.map(p => p.replace(/\?/g, '')).join(', ');
}

function countryOf(place) {
  const parts = String(place || '').split(',');
  return parts[parts.length - 1].trim();
}

/** Parse export rows into conflict clusters keyed by geocoded place. */
export function clusterEvents(files) {
  const clusters = new Map();
  const seenIds = new Set();
  let total = 0, geo = 0, conflict = 0;
  const byType = {};
  const byCountry = {};

  for (const f of files) {
    if (!f.text) continue;
    for (const line of f.text.split('\n')) {
      if (!line) continue;
      const c = line.split('\t');
      if (c.length < 61) continue;
      const id = c[C.id];
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      total++;
      const lat = parseFloat(c[C.lat]), lon = parseFloat(c[C.lon]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      geo++;
      const label = CONFLICT_ROOTS[+c[C.root]];
      if (!label) continue;
      conflict++;
      byType[label] = (byType[label] || 0) + 1;
      const place = cleanPlace(c[C.place]) || `${lat.toFixed(2)},${lon.toFixed(2)}`;
      const country = countryOf(place);
      byCountry[country] = (byCountry[country] || 0) + 1;

      let k = clusters.get(place);
      if (!k) {
        k = { name: place, country, lat, lon, events: 0, urls: new Set(), articles: 0, types: {}, gs: 0, tone: 0, latest: '', samples: [] };
        clusters.set(place, k);
      }
      k.events++;
      k.articles += +c[C.articles] || 0;
      k.types[label] = (k.types[label] || 0) + 1;
      k.gs += parseFloat(c[C.goldstein]) || 0;
      k.tone += parseFloat(c[C.tone]) || 0;
      if (c[C.added] > k.latest) k.latest = c[C.added];
      const url = c[C.url];
      if (url && !k.urls.has(url)) {
        k.urls.add(url);
        if (k.samples.length < 3) {
          k.samples.push({ type: label, actors: [cleanActor(c[C.actor1]), cleanActor(c[C.actor2])].filter(Boolean).join(' → '), url, articles: +c[C.articles] || 0 });
        }
      }
    }
  }

  const points = [...clusters.values()].map(k => {
    const dominant = Object.entries(k.types).sort((a, b) => b[1] - a[1] || SEVERITY[b[0]] - SEVERITY[a[0]])[0][0];
    // "worst" must be a real share of the cluster (>=20% of events or >=3 events), not a single stray code
    const worst = Object.entries(k.types).filter(([, n]) => n >= 3 || n / k.events >= 0.2)
      .sort((a, b) => SEVERITY[b[0]] - SEVERITY[a[0]])[0]?.[0] || dominant;
    return {
      name: k.name, country: k.country, lat: k.lat, lon: k.lon,
      count: k.urls.size,              // distinct source reports (kept as `count` for the dashboard)
      events: k.events, articles: k.articles,
      type: dominant, worst, types: k.types,
      goldstein: +(k.gs / k.events).toFixed(1), tone: +(k.tone / k.events).toFixed(1),
      latest: k.latest ? stampToIso(k.latest) : null,
      samples: k.samples.sort((a, b) => b.articles - a.articles),
    };
  }).sort((a, b) => b.count - a.count || b.articles - a.articles || SEVERITY[b.worst] - SEVERITY[a.worst]);

  return {
    points: points.slice(0, MAX_CLUSTERS),
    totalEvents: total, geoEvents: geo, conflictEvents: conflict, byType,
    topCountries: Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([country, events]) => ({ country, events })),
  };
}

export async function conflictEvents(hours = WINDOW_HOURS) {
  const started = Date.now();
  const latest = await latestStamp();
  const stamps = stampsBack(latest, Math.round(hours * 4));
  let files = await mapLimit(stamps, CONCURRENCY, fetchExport);
  // Under a full sweep the network is shared with 27 other sources; retry what timed out while budget remains
  const retry = files.filter(f => f.missing && f.status !== 404);
  if (retry.length && Date.now() - started < EXPORT_BUDGET_MS - FILE_TIMEOUT_MS) {
    const again = await mapLimit(retry.map(f => f.stamp), 3, fetchExport);
    files = files.map(f => again.find(a => a.stamp === f.stamp && a.text) || f);
  }
  const got = files.filter(f => f.text);
  const result = clusterEvents(got);
  return {
    ...result,
    windowHours: hours,
    filesFetched: got.length,
    filesMissing: files.length - got.length,
    newest: got.length ? stampToIso(got.map(f => f.stamp).sort().at(-1)) : null,
    oldest: got.length ? stampToIso(got.map(f => f.stamp).sort()[0]) : null,
    elapsedMs: Date.now() - started,
  };
}

// ---------- Briefing ----------

export async function briefing() {
  const [docRes, evRes] = await Promise.allSettled([
    searchEvents('conflict OR military OR economy OR crisis OR war OR sanctions OR tariff OR strike OR outbreak', { maxRecords: 50, timespan: '24h' }),
    conflictEvents(),
  ]);

  const doc = docRes.status === 'fulfilled' ? docRes.value : { error: docRes.reason?.message };
  const ev = evRes.status === 'fulfilled' ? evRes.value : { error: evRes.reason?.message, points: [] };

  const articles = (doc?.articles || []).map(compactArticle);
  const categorize = keywords => articles.filter(a => keywords.some(k => a.title?.toLowerCase().includes(k)));

  const signals = [];
  if (ev.conflictEvents) {
    const top = ev.topCountries.slice(0, 3).map(c => `${c.country} ${c.events}`).join(', ');
    signals.push(`${ev.conflictEvents.toLocaleString()} geocoded conflict events in the last ${ev.windowHours}h (${ev.filesFetched} GDELT updates) — most active: ${top}`);
    const worst = ev.points.find(p => p.worst === 'Mass violence' || p.worst === 'Armed clash');
    if (worst) signals.push(`${worst.worst} reporting cluster: ${worst.name} (${worst.count} sources)`);
  } else if (ev.error) {
    signals.push(`GDELT event export unavailable: ${ev.error}`);
  }
  if (doc?.rateLimited) signals.push('GDELT headline search rate-limited for this host; map events unaffected');

  return {
    source: 'GDELT',
    timestamp: new Date().toISOString(),
    totalArticles: articles.length,
    allArticles: articles,
    docStatus: doc?.error ? doc.error : 'ok',
    // Map layer: geocoded conflict clusters from the 15-minute event exports
    geoPoints: ev.points || [],
    events: {
      windowHours: ev.windowHours, filesFetched: ev.filesFetched, filesMissing: ev.filesMissing,
      newest: ev.newest, oldest: ev.oldest,
      totalEvents: ev.totalEvents || 0, geoEvents: ev.geoEvents || 0, conflictEvents: ev.conflictEvents || 0,
      byType: ev.byType || {}, topCountries: ev.topCountries || [],
      error: ev.error || null,
    },
    signals,
    conflicts: categorize(['military', 'conflict', 'war', 'strike', 'missile', 'attack', 'bomb', 'troops']),
    economy: categorize(['economy', 'recession', 'inflation', 'market', 'sanctions', 'tariff', 'trade', 'gdp']),
    health: categorize(['pandemic', 'outbreak', 'epidemic', 'disease', 'virus', 'health']),
    crisis: categorize(['crisis', 'disaster', 'emergency', 'refugee', 'famine']),
  };
}

// Run standalone
if (process.argv[1]?.endsWith('gdelt.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
