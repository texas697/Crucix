// WHO / CDC — public-health watch.
// No auth required.
//
// Three feeds, all official:
//   • WHO Disease Outbreak News (DON) JSON API — every formal outbreak notice WHO publishes. Notices about the same
//     event are grouped into "active outbreaks" with the number of updates, first/last notice and WHO's own risk
//     assessment (national / regional / global level) parsed from the notice text.
//   • CDC Travel Health Notices RSS — level 1–4 notices with the affected countries.
//   • CDC outbreak investigations RSS — multistate foodborne / zoonotic outbreaks under investigation in the US.
// The old RSS feed at who.int/feeds/entity/don/en/rss.xml returns 404; the DON JSON API ignores a plain $orderby
// unless $top is set, so the newest notices are requested explicitly and re-sorted client-side.

import { safeFetch } from '../utils/fetch.mjs';

const GHO_BASE = 'https://ghoapi.azureedge.net/api';
const DON_API = 'https://www.who.int/api/news/diseaseoutbreaknews';
const DON_FIELDS = 'Title,PublicationDate,DonId,ItemDefaultUrl,Summary,Assessment';
const CDC_TRAVEL_RSS = 'https://wwwnc.cdc.gov/travel/rss/notices.xml';
const CDC_OUTBREAKS_RSS = 'https://tools.cdc.gov/api/v2/resources/media/285676.rss';
const TIMEOUT_MS = 15000;
const UA = { 'User-Agent': 'Crucix/1.0' };

// A notice counts as "recent" inside this window; an outbreak counts as active while its last notice is inside
// ACTIVE_DAYS (WHO publishes follow-ups every two to four weeks for an ongoing event).
const RECENT_DAYS = parseInt(process.env.WHO_RECENT_DAYS) || 30;
const ACTIVE_DAYS = parseInt(process.env.WHO_ACTIVE_DAYS) || 90;

// Get GHO indicator data
export async function getIndicator(code, opts = {}) {
  const { filter = '', top = 20 } = opts;
  let url = `${GHO_BASE}/${code}?$top=${top}&$orderby=TimeDim desc`;
  if (filter) url += `&$filter=${filter}`;
  return safeFetch(url);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: UA });
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

const stripHtml = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;| | /g, ' ')
  .replace(/&rsquo;|&#39;|&apos;/g, "'").replace(/&ndash;|&mdash;/g, '-').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  // numeric entities last: RSS titles arrive double-escaped (&amp;#233;)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/\s+/g, ' ').trim();

// Minimal RSS item reader (title, description, link, pubDate, categories). No external XML dependency.
function parseRss(xml) {
  const items = [];
  const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    if (!m) return '';
    return stripHtml(m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  };
  for (const block of xml.split(/<item[\s>]/).slice(1)) {
    const cats = [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map(m => stripHtml(m[1]));
    items.push({ title: stripHtml(tag(block, 'title')), description: tag(block, 'description'), link: tag(block, 'link'), pubDate: tag(block, 'pubDate'), categories: cats });
  }
  return items;
}

// ---- WHO Disease Outbreak News -------------------------------------------------------------------------------

// Split "Ebola disease caused by Bundibugyo virus - Democratic Republic of the Congo & Uganda" into the disease
// and the places. WHO uses " - ", " – " or ", " between the two.
function splitTitle(title) {
  const t = stripHtml(title);
  const m = t.match(/^(.*?)\s*(?:[-–—]|,)\s*(.+)$/);
  if (!m) return { disease: t, places: [] };
  const places = m[2].split(/\s*(?:&|,|\band\b)\s*/).map(p => p.replace(/^the\s+/i, '').trim()).filter(Boolean);
  return { disease: m[1].trim(), places };
}

// Grouping key: the disease without the words WHO alternates between notices ("cluster" / "outbreak" / "cases").
function diseaseKey(disease) {
  return disease.toLowerCase().replace(/\b(cluster|outbreak|cases?|disease|infection|of|the|a)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const LEVELS = ['low', 'moderate', 'high', 'very high'];
const levelRank = l => LEVELS.indexOf(l);

// Pull WHO's risk assessment out of the "Assessment" section. WHO writes sentences such as "the risk at the
// national level is assessed as high, moderate at the regional level and low at the global level" or "the risk in
// the Democratic Republic of the Congo was assessed as very high". Only sentences that mention assessing a risk are
// read, and the newest statement for each scope wins because notices restate earlier assessments first.
export function parseRisk(assessment) {
  const text = stripHtml(assessment);
  if (!text) return null;
  const risk = {};
  const sentences = text.split(/(?<=\.)\s+/).filter(s => /\brisk/i.test(s) && /\b(assess|consider|remain|is|as)\b/i.test(s));
  const LEVEL_RE = /\b(very high|high|moderate|low)\b(?![-\w])/gi; // not "high-threat", "low-income"
  for (const s of sentences) {
    // Pair each level word with the nearest scope word in the same clause.
    const clauses = s.split(/[,;]|\band\b|\bwhile\b|\bwhereas\b/i);
    let lastScope = null;
    for (const c of clauses) {
      const scope = /\bglobal\b|\binternational\b/i.test(c) ? 'global'
        : /\bregional\b|\bregion\b|\bneighbo?uring\b|\bborder/i.test(c) ? 'regional'
        : /\bnational\b|\bcountry\b|\bin the\b|\bin [A-Z]/.test(c) ? 'national' : null;
      const levels = [...c.matchAll(LEVEL_RE)].map(m => m[1].toLowerCase());
      if (!levels.length) { if (scope) lastScope = scope; continue; }
      const target = scope || lastScope;
      if (!target) continue;
      risk[target] = levels[levels.length - 1];
      lastScope = target;
    }
  }
  if (!Object.keys(risk).length) {
    // No scoped statement: fall back to the strongest level stated in an assessing sentence.
    const all = sentences.filter(s => /assess/i.test(s)).flatMap(s => [...s.matchAll(LEVEL_RE)].map(m => m[1].toLowerCase()));
    if (!all.length) return null;
    risk.overall = all.sort((a, b) => levelRank(b) - levelRank(a))[0];
  }
  const max = Object.values(risk).sort((a, b) => levelRank(b) - levelRank(a))[0];
  return { ...risk, max };
}

export async function getOutbreakNews() {
  try {
    const url = `${DON_API}?$orderby=PublicationDate%20desc&$top=100&$select=${encodeURIComponent(DON_FIELDS)}`;
    const data = JSON.parse(await fetchText(url));
    const items = (data?.value || []).filter(i => i.PublicationDate);
    // Server ignores $orderby without $top, so sort defensively.
    items.sort((a, b) => new Date(b.PublicationDate) - new Date(a.PublicationDate));
    return items.map(item => {
      const { disease, places } = splitTitle(item.Title);
      return {
        title: stripHtml(item.Title),
        disease, places,
        date: item.PublicationDate,
        donId: item.DonId || null,
        url: item.ItemDefaultUrl ? `https://www.who.int/emergencies/disease-outbreak-news${item.ItemDefaultUrl}` : null,
        summary: stripHtml(item.Summary).slice(0, 300) || null,
        risk: parseRisk(item.Assessment),
      };
    });
  } catch (e) {
    return { error: e.message };
  }
}

// Group notices into outbreaks: one entry per disease, places merged, newest notice first.
export function groupOutbreaks(notices, now = Date.now()) {
  const cutoff = now - ACTIVE_DAYS * 86400000;
  const groups = new Map();
  for (const n of notices) {
    const key = diseaseKey(n.disease);
    let g = groups.get(key);
    if (!g) {
      g = { key, disease: n.disease, places: [], updates: 0, firstDate: n.date, lastDate: n.date, latestDonId: n.donId, url: n.url, summary: n.summary, risk: null, notices: [] };
      groups.set(key, g);
    }
    g.updates += 1;
    if (new Date(n.date) < new Date(g.firstDate)) g.firstDate = n.date;
    if (new Date(n.date) > new Date(g.lastDate)) { g.lastDate = n.date; g.latestDonId = n.donId; g.url = n.url; g.summary = n.summary; g.disease = n.disease; }
    for (const p of n.places) if (!g.places.some(x => x.toLowerCase() === p.toLowerCase())) g.places.push(p);
    // Risk: the newest notice that states one.
    if (!g.risk && n.risk) g.risk = n.risk;
    g.notices.push({ donId: n.donId, date: n.date, title: n.title });
  }
  return [...groups.values()]
    .filter(g => new Date(g.lastDate).getTime() >= cutoff)
    .map(g => ({ ...g, active: true, notices: g.notices.slice(0, 20) }))
    .sort((a, b) => levelRank(b.risk?.max) - levelRank(a.risk?.max) || new Date(b.lastDate) - new Date(a.lastDate));
}

// ---- CDC ---------------------------------------------------------------------------------------------------------

const CDC_LEVELS = { 1: 'Practice usual precautions', 2: 'Practice enhanced precautions', 3: 'Reconsider nonessential travel', 4: 'Avoid all travel' };

export async function getCdcTravelNotices() {
  try {
    const items = parseRss(await fetchText(CDC_TRAVEL_RSS));
    return items.map(i => {
      const m = i.title.match(/^Level\s*(\d)\s*[-–—:]\s*(.+)$/i);
      const level = m ? parseInt(m[1]) : null;
      const name = m ? m[2].trim() : i.title;
      // The description repeats the country list several times as it grows; take the longest occurrence.
      const lists = [...i.description.matchAll(/Country List\s*:\s*([^]*?)(?=Country List\s*:|$)/gi)].map(x => x[1].trim());
      const longest = lists.sort((a, b) => b.length - a.length)[0] || '';
      let countries = [...new Set(longest.split(/,\s*/).map(c => c.replace(/\s*\(.*?\)\s*/g, ' ').replace(/including.*$/i, '').trim()).filter(c => c && c.length < 60))];
      // Single-destination notices carry no list; the country is the tail of the name ("Yellow Fever in Colombia",
      // "... Provinces of the Democratic Republic of the Congo").
      if (!countries.length) {
        const tail = name.split(/\s+in\s+(?:the\s+)?/)[1];
        if (tail) {
          // "Ituri and Nord-Kivu Provinces of the Democratic Republic of the Congo" → the country after "Provinces of".
          const country = tail.replace(/^.*?\b(?:Provinces?|States?|Regions?|Districts?|Islands?)\s+of\s+(?:the\s+)?/i, '');
          countries = (country !== tail ? [country] : country.split(/\s+and\s+/)).map(c => c.replace(/^the\s+/i, '').trim()).filter(Boolean);
        }
      }
      const text = i.description.split(/Country List\s*:/i)[0].trim();
      return { level, levelLabel: CDC_LEVELS[level] || null, name, title: i.title, countries, summary: text.slice(0, 240), url: i.link || null, date: i.pubDate ? new Date(i.pubDate).toISOString() : null };
    }).filter(n => n.level != null).sort((a, b) => b.level - a.level || new Date(b.date) - new Date(a.date));
  } catch (e) {
    return { error: e.message };
  }
}

export async function getCdcOutbreaks() {
  try {
    const items = parseRss(await fetchText(CDC_OUTBREAKS_RSS));
    return items.map(i => ({
      title: i.title, summary: i.description && i.description !== i.title ? i.description.slice(0, 240) : null,
      categories: i.categories.filter(c => c && !/^outbreaks$/i.test(c)), url: i.link || null,
      date: i.pubDate ? new Date(i.pubDate).toISOString() : null,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (e) {
    return { error: e.message };
  }
}

// ---- Briefing ------------------------------------------------------------------------------------------------------

export async function briefing() {
  const started = Date.now();
  const [don, travel, cdcOut] = await Promise.all([getOutbreakNews(), getCdcTravelNotices(), getCdcOutbreaks()]);
  const notices = Array.isArray(don) ? don : [];
  const recentCutoff = Date.now() - RECENT_DAYS * 86400000;
  const recent = notices.filter(n => new Date(n.date).getTime() >= recentCutoff);
  const outbreaks = groupOutbreaks(notices);
  const travelNotices = Array.isArray(travel) ? travel : [];
  const cdcOutbreaks = Array.isArray(cdcOut) ? cdcOut : [];

  const signals = [];
  for (const o of outbreaks.filter(o => levelRank(o.risk?.max) >= levelRank('high'))) {
    const scope = o.risk.national ? `national ${o.risk.national}` : '';
    const parts = [scope, o.risk.regional ? `regional ${o.risk.regional}` : '', o.risk.global ? `global ${o.risk.global}` : ''].filter(Boolean).join(', ');
    signals.push(`WHO RISK ${o.risk.max.toUpperCase()}: ${o.disease} (${o.places.join(', ') || 'multi-country'}) — ${o.updates} notices since ${o.firstDate.slice(0, 10)}${parts ? `; ${parts}` : ''}`);
  }
  for (const o of outbreaks.filter(o => new Date(o.lastDate).getTime() >= Date.now() - 7 * 86400000 && levelRank(o.risk?.max) < levelRank('high'))) {
    signals.push(`New WHO notice: ${o.title || o.disease} (${o.places.join(', ') || 'multi-country'}) on ${o.lastDate.slice(0, 10)}`);
  }
  const l3 = travelNotices.filter(n => n.level >= 3);
  if (l3.length) signals.push(`CDC level ${l3[0].level} travel notice${l3.length > 1 ? 's' : ''}: ${l3.map(n => n.name).join('; ')}`);
  if (outbreaks.length) signals.push(`${outbreaks.length} outbreak${outbreaks.length > 1 ? 's' : ''} with WHO notices in the last ${ACTIVE_DAYS} days; ${recent.length} notice${recent.length === 1 ? '' : 's'} in the last ${RECENT_DAYS} days`);

  return {
    source: 'WHO',
    timestamp: new Date().toISOString(),
    // Recent WHO notices (back-compat for the map layer and the briefing prompt).
    diseaseOutbreakNews: recent.slice(0, 15),
    outbreakError: Array.isArray(don) ? null : don.error,
    outbreaks,
    noticesInFeed: notices.length,
    oldestNotice: notices.at(-1)?.date || null,
    recentDays: RECENT_DAYS, activeDays: ACTIVE_DAYS,
    cdc: {
      travelNotices, travelError: Array.isArray(travel) ? null : travel.error,
      outbreaks: cdcOutbreaks, outbreaksError: Array.isArray(cdcOut) ? null : cdcOut.error,
    },
    signals,
    monitoringCapabilities: [
      'WHO Disease Outbreak News (DONs) grouped into active outbreaks with WHO risk levels',
      'CDC Travel Health Notices (levels 1–4)',
      'CDC multistate outbreak investigations',
      'Global health indicators (GHO)',
    ],
    durationMs: Date.now() - started,
  };
}

if (process.argv[1]?.endsWith('who.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
