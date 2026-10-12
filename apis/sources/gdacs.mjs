// GDACS — Global Disaster Alert and Coordination System (UN OCHA / EU JRC).
// No auth required. One GeoJSON call returns every event currently at Orange or Red alert: earthquakes, tropical
// cyclones, floods, volcanoes, droughts and wildfires, with affected countries, a severity string and links to the
// report and the event polygon. Alert levels are GDACS's own (Green/Orange/Red, scored 0–3 by expected humanitarian
// impact), so a Red cyclone and a Red drought are comparable on the dashboard.

import { safeFetch } from '../utils/fetch.mjs';

const API = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH';
const TYPES = 'EQ,TC,FL,VO,DR,WF';
const TIMEOUT_MS = 20000;
// GDACS keeps closed events in the Orange/Red list for months; keep the ones still current or ended recently.
const STALE_DAYS = parseInt(process.env.GDACS_STALE_DAYS) || 10;

export const TYPE_LABEL = { EQ: 'Earthquake', TC: 'Tropical cyclone', FL: 'Flood', VO: 'Volcano', DR: 'Drought', WF: 'Wildfire', TS: 'Tsunami' };

function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

// Drought names repeat the country list twice ("Drought in A, B A, B"); keep the part before the repeat.
function tidyName(name) {
  const n = clean(name);
  const m = n.match(/^(Drought in )(.+)$/);
  if (!m) return n;
  const list = m[2];
  const half = Math.floor(list.length / 2);
  for (let cut = half - 20; cut <= half + 20; cut++) {
    const a = list.slice(0, cut).trim().replace(/,$/, ''), b = list.slice(cut).trim();
    if (a && a === b) return m[1] + a;
  }
  return n.length > 90 ? n.slice(0, 87) + '…' : n;
}

export function normalizeEvent(f) {
  const p = f.properties || {};
  const [lon, lat] = f.geometry?.type === 'Point' ? f.geometry.coordinates : [num(p.lon), num(p.lat)];
  const countries = (p.affectedcountries || []).map(c => ({ iso2: c.iso2, iso3: c.iso3, name: c.countryname })).filter(c => c.name);
  return {
    id: `${p.eventtype}-${p.eventid}`, eventId: p.eventid, episodeId: p.episodeid,
    type: p.eventtype, typeLabel: TYPE_LABEL[p.eventtype] || p.eventtype,
    level: p.alertlevel, score: num(p.alertscore), episodeLevel: p.episodealertlevel,
    name: tidyName(p.name || p.eventname || p.description), eventName: clean(p.eventname),
    country: clean(p.country).split(',')[0] || countries[0]?.name || null, iso3: p.iso3 || countries[0]?.iso3 || null,
    countries,
    lat: num(lat), lon: num(lon),
    from: p.fromdate || null, to: p.todate || null, modified: p.datemodified || null,
    current: String(p.iscurrent) === 'true',
    severity: p.severitydata && num(p.severitydata.severity) ? { value: num(p.severitydata.severity), text: clean(p.severitydata.severitytext).replace(/^Magnitude 0.*$/, ''), unit: p.severitydata.severityunit || null } : null,
    report: p.url?.report || null, geometry: p.url?.geometry || null,
  };
}

export async function briefing() {
  const started = Date.now();
  const data = await safeFetch(`${API}?eventlist=${TYPES}&alertlevel=Orange;Red`, { timeout: TIMEOUT_MS, retries: 1 });
  if (!Array.isArray(data?.features)) {
    return { source: 'GDACS', timestamp: new Date().toISOString(), error: data?.error || 'GDACS returned no feature list', events: [], signals: ['GDACS unavailable'] };
  }
  const staleCutoff = Date.now() - STALE_DAYS * 86400000;
  const events = data.features.map(normalizeEvent).filter(e => e.lat != null && e.lon != null)
    .filter(e => e.current || new Date(e.to || e.modified || e.from).getTime() >= staleCutoff)
    .sort((a, b) => (b.current - a.current) || (b.level === 'Red') - (a.level === 'Red') || (b.score || 0) - (a.score || 0) || new Date(b.modified || b.from) - new Date(a.modified || a.from));
  const red = events.filter(e => e.level === 'Red');
  const orange = events.filter(e => e.level === 'Orange');
  const byType = {};
  for (const e of events) byType[e.type] = (byType[e.type] || 0) + 1;
  const dayAgo = Date.now() - 86400000;
  const fresh = events.filter(e => new Date(e.from).getTime() >= dayAgo || new Date(e.modified).getTime() >= dayAgo);

  const signals = [];
  for (const e of red) signals.push(`GDACS RED: ${e.name}${e.country ? ` (${e.country})` : ''}${e.severity?.text ? ` — ${e.severity.text}` : ''}`);
  for (const e of orange.filter(e => ['TC', 'EQ', 'VO'].includes(e.type) && e.current).slice(0, 4)) signals.push(`GDACS Orange ${e.typeLabel.toLowerCase()}: ${e.name}${e.severity?.text ? ` — ${e.severity.text}` : ''}`);
  signals.push(`${events.length} GDACS events at Orange or Red: ${Object.entries(byType).map(([t, n]) => `${n} ${TYPE_LABEL[t] || t}`).join(', ')}${fresh.length ? `; ${fresh.length} new or updated in 24h` : ''}`);

  return {
    source: 'GDACS', timestamp: new Date().toISOString(),
    events, counts: { total: events.length, current: events.filter(e => e.current).length, red: red.length, orange: orange.length, byType, updated24h: fresh.length, listed: data.features.length, staleDays: STALE_DAYS },
    signals, durationMs: Date.now() - started,
  };
}

if (process.argv[1]?.endsWith('gdacs.mjs')) {
  console.log(JSON.stringify(await briefing(), null, 2));
}
