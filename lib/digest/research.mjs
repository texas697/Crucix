// "Read more about it": gather fresh sources on the article's topic and have the user's own model
// write a cited deep-dive. Search = GDELT DOC API (free, no key) + Tavily when TAVILY_API_KEY is set.
import { extractFromUrl } from './extract.mjs';
import { decodeEntities, parseFeed } from './rss.mjs';

const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc';
const TAVILY = 'https://api.tavily.com/search';

const SYSTEM = `You are a senior research analyst at an intelligence firm. Write a 1200-2000 word markdown deep-dive companion to the provided article for a reader who wants to understand the topic properly.

Structure:
## What happened
## Background and context
## Key actors and their interests
## Competing interpretations
## Implications (security, economic, markets)
## What to watch next
## Sources
List every source you used as [n] Title — URL.

Rules: cite sources inline as [n]. Only use facts present in the article or the provided sources; if the sources disagree, say so. Never invent quotes, figures or URLs. No preamble.`;

function keywords(title) {
  const stop = new Set(['the','a','an','and','or','of','to','in','on','for','with','as','by','at','from','is','are','was','were','be','it','its','that','this','after','over','into','amid','how','why','what','who','says','say','new','up','down','out']);
  return String(title || '').replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w.toLowerCase())).slice(0, 8);
}

function buildQueries(article) {
  const kw = keywords(article.title);
  // GDELT ANDs bare words; keep queries short so they actually match
  const q = [kw.slice(0, 4).join(' '), kw.slice(0, 2).concat(kw.slice(4, 6)).join(' ')];
  const topic = (article.topics || []).find(t => !['geopolitics', 'markets', 'macro'].includes(t));
  if (topic) q.push(`${topic.replace(/-/g, ' ')} ${kw.slice(0, 2).join(' ')}`);
  return [...new Set(q.map(x => x.trim()).filter(x => x.split(' ').length >= 2))].slice(0, 3);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function gdeltSearch(query, timeout = 15000, attempt = 0) {
  const url = `${GDELT}?query=${encodeURIComponent(`${query} sourcelang:english`)}&mode=artlist&maxrecords=15&format=json&sort=hybridrel&timespan=21d`;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'MFBIntel/1.0 (research)' } });
    if (res.status === 429 && attempt < 2) { clearTimeout(timer); await sleep(4000 * (attempt + 1)); return gdeltSearch(query, timeout, attempt + 1); }
    if (!res.ok) throw new Error(`gdelt ${res.status}`);
    const data = await res.json().catch(() => ({}));
    return (data.articles || []).map(a => ({ title: decodeEntities(a.title || ''), url: a.url, domain: a.domain, date: a.seendate || null, snippet: '' }));
  } finally { clearTimeout(timer); }
}

// DuckDuckGo lite — free, no key, best-effort (parsed from HTML; failures are ignored)
async function ddgSearch(query, timeout = 12000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query + ' news analysis')}`, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128 Safari/537.36' } });
    if (!res.ok) throw new Error(`ddg ${res.status}`);
    const html = await res.text();
    const out = []; const re = /<a([^>]+)>([\s\S]*?)<\/a>/gi; let m;
    while ((m = re.exec(html)) && out.length < 8) {
      if (!/class=['"]result-link['"]/i.test(m[1])) continue;
      const hm = m[1].match(/href=['"]([^'"]+)['"]/i); if (!hm) continue;
      let href = decodeEntities(hm[1]); if (href.startsWith('//')) href = 'https:' + href;
      const u = href.match(/uddg=([^&]+)/); if (u) href = decodeURIComponent(u[1]);
      if (!/^https?:\/\//.test(href)) continue;
      out.push({ title: decodeEntities(m[2].replace(/<[^>]+>/g, '')).trim(), url: href, domain: (() => { try { return new URL(href).hostname.replace(/^www\./, ''); } catch { return ''; } })(), date: null, snippet: '' });
    }
    return out;
  } finally { clearTimeout(timer); }
}

// Bing's RSS output — free, no key, real publisher links
async function bingSearch(query, timeout = 12000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128 Safari/537.36' } });
    if (!res.ok) throw new Error(`bing ${res.status}`);
    const items = parseFeed(await res.text());
    return items.slice(0, 10).map(i => ({ title: i.title, url: i.url, domain: (() => { try { return new URL(i.url).hostname.replace(/^www\./, ''); } catch { return ''; } })(), date: i.publishedAt, snippet: i.description || '' }));
  } finally { clearTimeout(timer); }
}

// Our own library: digest articles sharing keywords/topics (free, already extracted)
function librarySearch(article, store) {
  const kw = new Set(keywords(article.title).map(w => w.toLowerCase()));
  const topics = new Set(article.topics || []);
  const scored = [];
  for (const a of store.all()) {
    if (a.id === article.id || !a.text || a.text.length < 500) continue;
    const words = new Set(keywords(a.title).map(w => w.toLowerCase()));
    let score = 0; for (const w of words) if (kw.has(w)) score += 2;
    for (const t of a.topics || []) if (topics.has(t)) score += 1;
    if (score >= 3) scored.push({ score, r: { title: a.title, url: a.url, domain: (() => { try { return new URL(a.url).hostname.replace(/^www\./, ''); } catch { return a.source; } })(), date: a.publishedAt, snippet: a.text.slice(0, 3500), fromLibrary: true } });
  }
  return scored.sort((x, y) => y.score - x.score).slice(0, 3).map(x => x.r);
}

async function tavilySearch(query, apiKey, timeout = 20000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(TAVILY, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: apiKey, query, max_results: 6, include_answer: false, search_depth: 'basic' }) });
    if (!res.ok) throw new Error(`tavily ${res.status}`);
    const data = await res.json();
    return (data.results || []).map(r => ({ title: r.title || '', url: r.url, domain: (() => { try { return new URL(r.url).hostname; } catch { return ''; } })(), date: r.published_date || null, snippet: (r.content || '').slice(0, 1500) }));
  } finally { clearTimeout(timer); }
}

export async function runResearch({ article, provider, store, uid, log = console }) {
  const set = (fields) => store.setResearch(uid, article.id, fields);
  await set({ state: 'running', stage: 'searching', progress: 0, error: null });
  const queries = buildQueries(article);
  const tavilyKey = process.env.TAVILY_API_KEY || null;
  const found = new Map();
  const selfDomain = (() => { try { return new URL(article.url).hostname; } catch { return ''; } })();
  for (const r of (store.all ? librarySearch(article, store) : [])) found.set(r.url, r);
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const results = [];
    if (i > 0) await sleep(1200);
    const engines = [
      ['bing', () => bingSearch(q)],
      ['ddg', () => ddgSearch(q)],
      ['gdelt', () => gdeltSearch(q, 8000)],
    ];
    const settled = await Promise.allSettled(engines.map(([, f]) => f()));
    settled.forEach((r, k) => { if (r.status === 'fulfilled') results.push(...r.value); else log.warn?.(`[Research] ${engines[k][0]} "${q}": ${r.reason?.message}`); });
    if (tavilyKey) { try { results.push(...await tavilySearch(q, tavilyKey)); } catch (err) { log.warn?.(`[Research] tavily "${q}": ${err.message}`); } }
    for (const r of results) {
      if (!r.url || found.has(r.url) || r.url === article.url) continue;
      if (/youtube\.com|youtu\.be|facebook\.com|twitter\.com|x\.com|tiktok\.com|instagram\.com|reddit\.com|wikipedia\.org|pinterest\.|linkedin\.com|news\.google\.com|bing\.com|duckduckgo\.com/i.test(r.url)) continue;
      if (r.domain && r.domain === selfDomain && found.size > 2) continue;
      found.set(r.url, r);
    }
    await set({ stage: 'searching', progress: Math.round(((i + 1) / queries.length) * 40) });
  }
  // prefer one per domain, then read the top ones
  const byDomain = new Map();
  for (const r of found.values()) { if (!byDomain.has(r.domain)) byDomain.set(r.domain, r); }
  const picks = [...byDomain.values()].slice(0, 8);
  if (picks.length < 2) throw new Error('Could not find enough related coverage for this topic yet — try again later');

  await set({ stage: 'reading', progress: 45 });
  let done = 0;
  const sources = [];
  await Promise.all(picks.map(async (r) => {
    let text = r.snippet || '';
    if (!r.fromLibrary) {
      try { const ex = await extractFromUrl(r.url); if (ex.text && ex.text.length > text.length) text = ex.text; if (!r.title && ex.title) r.title = ex.title; }
      catch { /* keep snippet */ }
    }
    done++;
    if (text.length > 200) sources.push({ title: r.title || r.domain, url: r.url, domain: r.domain, date: r.date, text: text.slice(0, 3500) });
    await set({ progress: 45 + Math.round((done / picks.length) * 25) });
  }));
  if (sources.length < 2) throw new Error('Related pages could not be read (paywalls or bot walls)');

  await set({ stage: 'synthesizing', progress: 75, sources: sources.map(({ title, url, domain, date }) => ({ title, url, domain, date })) });
  const user = `Article title: ${article.title}\nSource: ${article.source}\nURL: ${article.url}\n\nArticle text:\n${(article.text || article.description || '').slice(0, 7000)}\n\nResearch sources:\n${sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.text}`).join('\n\n')}`;
  const r = await provider.complete(SYSTEM, user, { maxTokens: 6000, timeout: 180000 });
  const md = String(r?.text || '').trim();
  if (md.length < 400) throw new Error('Model returned an empty deep dive (check key/model)');
  if (!/^#{2,3}\s*sources?/im.test(md)) throw new Error('Deep dive was cut off before the Sources section — try a model with a larger output limit');
  await set({ state: 'done', stage: 'done', progress: 100, markdown: md, model: `${provider.name}/${provider.model || ''}`, completedAt: new Date().toISOString() });
  return md;
}
