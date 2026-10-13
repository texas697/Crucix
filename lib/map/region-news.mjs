// Map "area brief": the user draws a shape on the map, we work out which places fall inside it, pull every recent
// article we know about those places (sweep RSS cache, Readers Digest store, a live Google News query), and
// optionally have an LLM turn that into a short analyst brief. Pure functions + one factory, no Express here.

import { geoKeywords, fetchRSS } from '../../dashboard/inject.mjs';
import { estimateCost, formatUsd } from '../llm/pricing.mjs';

// Keywords in geoKeywords that are institutions / people, not places. They stay useful for geo-tagging headlines
// but must not be announced as "places in your selection".
const NOT_A_PLACE = new Set(['Trump', 'White House', 'Pentagon', 'Fed', 'Congress', 'Senate', 'IMF', 'World Bank', 'UN',
  'NASA', 'Wall Street', 'Silicon Valley', 'NATO', 'EU', 'America', 'US', 'Britain']);

// Extra search terms per place so "Kyiv" also finds "Ukrainian", "Kremlin" finds Russia, etc.
const ALIASES = {
  Ukraine: ['Ukrainian', 'Kyiv', 'Kiev', 'Zelensky', 'Donbas', 'Kharkiv', 'Odesa'],
  Russia: ['Russian', 'Moscow', 'Kremlin', 'Putin'],
  China: ['Chinese', 'Beijing', 'Xi Jinping', 'PLA'],
  Taiwan: ['Taiwanese', 'Taipei'],
  Iran: ['Iranian', 'Tehran', 'IRGC'],
  Israel: ['Israeli', 'IDF', 'Netanyahu', 'Tel Aviv', 'Jerusalem'],
  Gaza: ['Hamas', 'Rafah'],
  Lebanon: ['Lebanese', 'Hezbollah', 'Beirut'],
  Syria: ['Syrian', 'Damascus'],
  Iraq: ['Iraqi', 'Baghdad'],
  Yemen: ['Yemeni', 'Houthi', 'Sanaa'],
  Saudi: ['Saudi Arabia', 'Riyadh'],
  Korea: ['Korean', 'Pyongyang', 'Seoul', 'Kim Jong'],
  Japan: ['Japanese', 'Tokyo'],
  India: ['Indian', 'New Delhi', 'Modi'],
  Pakistan: ['Pakistani', 'Islamabad'],
  Germany: ['German', 'Berlin'],
  France: ['French', 'Paris', 'Macron'],
  UK: ['British', 'Britain', 'London', 'Westminster'],
  Poland: ['Polish', 'Warsaw'],
  Turkey: ['Turkish', 'Ankara', 'Erdogan'],
  Egypt: ['Egyptian', 'Cairo'],
  Sudan: ['Sudanese', 'Khartoum'],
  Nigeria: ['Nigerian', 'Abuja', 'Lagos'],
  Mexico: ['Mexican', 'Mexico City'],
  Brazil: ['Brazilian', 'Brasilia'],
  Venezuela: ['Venezuelan', 'Caracas', 'Maduro'],
  Canada: ['Canadian', 'Ottawa'],
  Australia: ['Australian', 'Canberra'],
  Philippines: ['Philippine', 'Manila'],
  Indonesia: ['Indonesian', 'Jakarta'],
  Afghanistan: ['Afghan', 'Kabul', 'Taliban'],
  Ethiopia: ['Ethiopian', 'Addis Ababa'],
  Somalia: ['Somali', 'Mogadishu'],
  Libya: ['Libyan', 'Tripoli'],
  Cuba: ['Cuban', 'Havana'],
  Greece: ['Greek', 'Athens'],
  Italy: ['Italian', 'Rome'],
  Spain: ['Spanish', 'Madrid'],
  Washington: ['White House', 'Pentagon', 'Congress', 'Senate', 'U.S.', 'United States', 'American'],
  'New York': ['Wall Street', 'NYC', 'Manhattan'],
  California: ['Los Angeles', 'San Francisco', 'Silicon Valley'],
  Texas: ['Houston', 'Dallas', 'Austin'],
  Florida: ['Miami', 'Tampa', 'Orlando'],
};

const R_EARTH = 6371.0088;
function haversineKm(a, b) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(s)));
}
function pointInRing(ring, lng, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

/** Validate + normalise the shape the browser sends. Throws on garbage. */
export function parseShape(input) {
  if (!input || typeof input !== 'object') throw Object.assign(new Error('shape required'), { status: 400 });
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  if (input.kind === 'circle') {
    const lat = num(input.center?.lat), lng = num(input.center?.lng), radiusKm = num(input.radiusKm);
    if (lat == null || lng == null || radiusKm == null || radiusKm <= 0 || radiusKm > 20000) throw Object.assign(new Error('bad circle'), { status: 400 });
    return { kind: 'circle', center: { lat, lng }, radiusKm, centroid: { lat, lng } };
  }
  if (input.kind === 'polygon') {
    const ring = Array.isArray(input.ring) ? input.ring.map(p => [num(p?.[0]), num(p?.[1])]).filter(p => p[0] != null && p[1] != null) : [];
    if (ring.length < 3 || ring.length > 500) throw Object.assign(new Error('bad polygon'), { status: 400 });
    const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length, lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return { kind: 'polygon', ring, centroid: { lat, lng } };
  }
  throw Object.assign(new Error('unknown shape kind'), { status: 400 });
}

export function shapeContains(shape, lat, lng) {
  if (shape.kind === 'circle') return haversineKm(shape.center, { lat, lng }) <= shape.radiusKm;
  return pointInRing(shape.ring, lng, lat);
}

function shapeSpanKm(shape) {
  if (shape.kind === 'circle') return shape.radiusKm * 2;
  let max = 0;
  for (const p of shape.ring) max = Math.max(max, haversineKm(shape.centroid, { lat: p[1], lng: p[0] }));
  return max * 2;
}

/** Places (countries/cities from the geo table) whose anchor point falls inside the shape, nearest-first. */
export function placesInShape(shape) {
  const inside = [], near = [];
  for (const [name, [lat, lon]] of Object.entries(geoKeywords)) {
    if (NOT_A_PLACE.has(name)) continue;
    const d = haversineKm(shape.centroid, { lat, lng: lon });
    const entry = { name, lat, lon, km: Math.round(d) };
    if (shapeContains(shape, lat, lon)) inside.push(entry); else near.push(entry);
  }
  inside.sort((a, b) => a.km - b.km);
  // Dedupe aliases that share coordinates (Britain/UK, Fed/Congress...) — keep the first, which is nearest anyway
  const seen = new Set(), out = [];
  for (const p of inside) { const k = `${p.lat},${p.lon}`; if (seen.has(k)) continue; seen.add(k); out.push(p); }
  if (out.length) return { places: out.slice(0, 12), fallback: false };
  // Ocean / empty desert: borrow the closest places within a sensible reach so the brief still has an anchor
  near.sort((a, b) => a.km - b.km);
  const reach = Math.max(800, shapeSpanKm(shape));
  return { places: near.filter(p => p.km <= reach).slice(0, 4), fallback: true };
}

function termsFor(places) {
  const terms = new Set();
  for (const p of places) { terms.add(p.name); for (const a of ALIASES[p.name] || []) terms.add(a); }
  return [...terms];
}
function matcher(terms) {
  if (!terms.length) return () => 0;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\p{L}])(${terms.map(esc).join('|')})(?![\\p{L}])`, 'giu');
  return text => { if (!text) return 0; const m = text.match(re); return m ? new Set(m.map(x => x.toLowerCase())).size : 0; };
}

const ageHours = d => { const t = new Date(d || 0).getTime(); return t ? (Date.now() - t) / 3600000 : 24 * 30; };
const normTitle = t => String(t || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 70);

// Live Google News RSS for the top places. Cached per query so repeated selections in the same area are free.
const liveCache = new Map();
const LIVE_TTL = 10 * 60 * 1000;
const unesc = s => String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
async function liveNews(places) {
  const top = places.slice(0, 3).map(p => p.name);
  if (!top.length) return [];
  const q = top.map(n => (n.includes(' ') ? `"${n}"` : n)).join(' OR ');
  const key = q.toLowerCase();
  const hit = liveCache.get(key);
  if (hit && Date.now() - hit.at < LIVE_TTL) return hit.items;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:3d')}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MFB-Intelligence/1.0)' } });
  if (!res.ok) throw new Error(`Google News ${res.status}`);
  const xml = await res.text();
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const source = unesc(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]);
    let title = unesc(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]);
    const link = unesc(block.match(/<link>([\s\S]*?)<\/link>/)?.[1]) || unesc(block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]);
    const pub = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    if (source && title.toLowerCase().endsWith(` - ${source.toLowerCase()}`)) title = title.slice(0, -(source.length + 3)).trim();
    if (!title || !/^https?:/i.test(link)) continue;
    if (title.toLowerCase() === (source || '').toLowerCase()) continue;           // feed junk: publisher name as headline
    const publishedAt = pub && !Number.isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : null;
    // "ABC News - Breaking News, Latest News and Videos" → "ABC News"
    const cleanSource = (source || 'Google News').split(/\s[-–|]\s/)[0].trim().slice(0, 40);
    items.push({ title: title.slice(0, 200), source: cleanSource, url: link, publishedAt, via: 'live' });
    if (items.length >= 40) break;
  }
  liveCache.set(key, { at: Date.now(), items });
  if (liveCache.size > 200) liveCache.delete(liveCache.keys().next().value);
  return items;
}

// Same story from six outlets should not eat six of fourteen slots: drop a headline when it shares most of its
// meaningful words with one we already kept.
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'as', 'at', 'by', 'with', 'from', 'says', 'say', 'after', 'over', 'into', 'is', 'are', 'be', 'has', 'have', 'its', 'it', 'that', 'this', 'new', 'live', 'news', 'latest', 'update', 'updates']);
const tokens = t => new Set(String(t || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
function nearDuplicate(a, b) {
  if (!a.size || !b.size) return false;
  let inter = 0; for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size) >= 0.6 && inter >= 3;
}

/**
 * Collect + rank articles for the shape.
 * @param shape           parsed shape
 * @param places          from placesInShape
 * @param sweepNews       currentData.news (geo-tagged RSS from the last sweep)
 * @param digestArticles  digest store.all()
 */
export async function collectArticles(shape, places, { sweepNews = [], digestArticles = [], live = true } = {}) {
  const score = matcher(termsFor(places));
  const out = [];
  for (const n of sweepNews) {
    const geo = n.lat != null && shapeContains(shape, n.lat, n.lon);
    const hits = score(n.title);
    if (!geo && !hits) continue;
    out.push({ title: n.title, source: n.source, url: n.url, publishedAt: n.date ? new Date(n.date).toISOString() : null, via: 'sweep', hits: hits + (geo ? 1 : 0) });
  }
  for (const a of digestArticles) {
    if (ageHours(a.publishedAt || a.fetchedAt) > 24 * 7) continue;
    const hits = score(`${a.title} ${a.description || ''}`) || (score((a.text || '').slice(0, 2500)) ? 0.5 : 0);
    if (!hits) continue;
    out.push({ id: a.id, title: a.title, source: a.source, url: a.url, publishedAt: a.publishedAt || a.fetchedAt, via: 'digest', kind: a.kind, hits, hasWriteup: !!a.summarizedBy });
  }
  let liveErr = null;
  if (live) {
    try { for (const it of await liveNews(places)) out.push({ ...it, hits: score(it.title) || 0.4 }); }
    catch (e) { liveErr = e.message; }
  }
  // dedupe by title, prefer the digest copy (it opens in the reader)
  const byTitle = new Map();
  for (const it of out) {
    const k = normTitle(it.title); if (!k) continue;
    const prev = byTitle.get(k);
    if (!prev || (it.via === 'digest' && prev.via !== 'digest')) byTitle.set(k, { ...it, hits: Math.max(it.hits, prev?.hits || 0) });
  }
  const ranked = [...byTitle.values()].map(it => {
    const h = ageHours(it.publishedAt);
    const recency = h < 6 ? 3 : h < 24 ? 2.2 : h < 72 ? 1.2 : h < 168 ? 0.4 : 0;
    return { ...it, score: recency + it.hits * 0.8 + (it.via === 'digest' ? 0.3 : 0) + (it.kind === 'thinktank' ? 0.2 : 0) };
  }).sort((a, b) => b.score - a.score);
  const kept = [], keptTok = [];
  for (const it of ranked) {
    const tk = tokens(it.title);
    if (keptTok.some(k => nearDuplicate(k, tk))) continue;
    kept.push(it); keptTok.push(tk);
    if (kept.length >= 14) break;
  }
  return { articles: kept.map(({ hits, score, ...rest }) => rest), total: ranked.length, liveErr };
}

const BRIEF_SYSTEM = `You are the duty analyst on an open-source intelligence desk. A user has drawn an area on a world map; you receive the places inside it, the live sensor markers inside it, and the most recent headlines about it. Write a brief for that area only.

Rules: no preamble, no first person, no speculation presented as fact, no filler. Prefer the newest items. Cite headlines by their [n] index. If the headlines do not support a claim, say so. If the area is quiet, say it is quiet in one line rather than inventing significance.

Return ONLY JSON in this exact shape:
{"headline": "<= 12 words, the one thing to know",
 "summary": "2-3 sentences on the current situation",
 "developments": ["3-5 bullets, each <= 25 words, each ending with [n] citations"],
 "watch": "one sentence: what would change the picture in the next 24-72h",
 "tone": "calm" | "elevated" | "critical"}`;

function buildBriefInput(places, articles, markers, fallback) {
  const lines = [];
  lines.push(`Time now: ${new Date().toISOString()}`);
  lines.push(`Places in the selected area${fallback ? ' (nearest to an empty area)' : ''}: ${places.map(p => p.name).join(', ') || 'none'}`);
  if (markers?.counts && Object.keys(markers.counts).length) {
    lines.push(`Live markers inside the area: ${Object.entries(markers.counts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    if (markers.samples?.length) lines.push(`Marker samples: ${markers.samples.slice(0, 14).map(s => String(s).slice(0, 110)).join(' | ')}`);
  }
  lines.push('Recent headlines (newest first within each rank):');
  articles.forEach((a, i) => {
    const h = ageHours(a.publishedAt); const age = h < 1 ? 'just now' : h < 24 ? `${Math.floor(h)}h ago` : `${Math.floor(h / 24)}d ago`;
    lines.push(`[${i + 1}] (${a.source}, ${age}) ${a.title}`);
  });
  if (!articles.length) lines.push('(no matching headlines)');
  return lines.join('\n');
}

function parseBrief(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  const j = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw);
  return {
    headline: String(j.headline || '').slice(0, 160),
    summary: String(j.summary || '').slice(0, 900),
    developments: Array.isArray(j.developments) ? j.developments.map(d => String(d).slice(0, 260)).slice(0, 6) : [],
    watch: String(j.watch || '').slice(0, 300),
    tone: ['calm', 'elevated', 'critical'].includes(j.tone) ? j.tone : 'calm',
  };
}

/**
 * Operator-key budget: protects the site owner's shared key from runaway use. In-memory, resets on restart.
 */
export function createBudget({ perUserPerHour = 30, perDay = 400, unit = 'briefs' } = {}) {
  const perUser = new Map(); let day = { date: '', n: 0 };
  return {
    take(uid) {
      const today = new Date().toISOString().slice(0, 10);
      if (day.date !== today) day = { date: today, n: 0 };
      const now = Date.now();
      const hist = (perUser.get(uid) || []).filter(t => now - t < 3600000);
      if (hist.length >= perUserPerHour) return { ok: false, reason: `Shared-key limit reached (${perUserPerHour} ${unit} per hour per user). Add your own AI key in Settings for unlimited ${unit}.` };
      if (day.n >= perDay) return { ok: false, reason: `The site's shared AI budget for today is used up (${perDay} ${unit}). Add your own AI key in Settings to keep going.` };
      hist.push(now); perUser.set(uid, hist); day.n++;
      return { ok: true, remainingToday: perDay - day.n };
    },
    status() { return { today: day.n, perDay }; },
  };
}

/**
 * Generate the brief. `provider` is whichever LLM we decided to use; `keyOwner` is 'user' or 'operator'.
 */
export async function writeBrief(provider, keyOwner, { places, articles, markers, fallback }) {
  const t0 = Date.now();
  const r = await provider.complete(BRIEF_SYSTEM, buildBriefInput(places, articles, markers, fallback), { maxTokens: 900, timeout: 45000 });
  const brief = parseBrief(r.text);
  const model = r.model || provider.model || null;
  const cost = estimateCost(provider.name, model, r.usage || {});
  return {
    brief,
    llm: {
      keyOwner, provider: provider.name, model,
      inputTokens: r.usage?.inputTokens || 0, outputTokens: r.usage?.outputTokens || 0,
      costUsd: cost.usd, costLabel: formatUsd(cost.usd), costExact: cost.exact,
      inputPerM: cost.inputPerM, outputPerM: cost.outputPerM, ms: Date.now() - t0,
    },
  };
}
