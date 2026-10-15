// Air activity — OpenSky Network with adsb.lol fallback
//
// OpenSky's anonymous quota is 400 credits per IP per day and a bounding-box query costs up to 4, so ten
// theater queries per 15-minute sweep exhausted it within hours and every later call was an instant 429
// (Cloud Run egress IPs are shared, which makes it worse). The source now makes ONE global /states/all
// request per sweep (4 credits -> 384/day, inside the anonymous quota and far inside the 4,000 an account
// gets) and slices it into theaters locally. With OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET set it
// authenticates via OAuth2 client credentials (opensky-network.org -> Account -> API client).
//
// In parallel it pulls adsb.lol's global military feed (free, fast, no key) plus a sampled area query per
// theater, so the air layer still has live data when OpenSky is throttled. Everything is capped to stay
// inside the 30 s per-source budget in briefing.mjs.

import { safeFetch } from '../utils/fetch.mjs';

// OpenSky firewalls Google Cloud address space (TCP connects time out from Cloud Run), so an optional relay
// (deploy/opensky-relay.py on any non-Google host) forwards both the token exchange and the API calls.
const RELAY = (process.env.OPENSKY_RELAY_URL || '').replace(/\/$/, '');
const RELAY_HEADERS = RELAY && process.env.OPENSKY_RELAY_TOKEN ? { 'X-Relay-Token': process.env.OPENSKY_RELAY_TOKEN } : {};
const BASE = RELAY ? `${RELAY}/api` : 'https://opensky-network.org/api';
const TOKEN_URL = RELAY ? `${RELAY}/token` : 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const ADSB = 'https://api.adsb.lol/v2';
const BUDGET_MS = 22000;
// adsb.lol rejects generic agents and throttles at roughly one request per second per IP
const ADSB_HEADERS = { 'User-Agent': 'Crucix/2.0 (MFB Services Intelligence dashboard; +https://crucix-intel-41718.firebaseapp.com)' };
// Measured 2026-10-11: bursts and even 1.5 s spacing get 429s; ~5 s spacing is reliably accepted.
const ADSB_GAP_MS = Math.max(1000, Number(process.env.ADSB_LOL_GAP_MS) || 4000);
const ADSB_CACHE_MAX_MS = 90 * 60000;
// Theaters are sampled in rotation across sweeps (about 4 per sweep fit the budget); the instance keeps
// the last sample per theater so every theater still has recent data.
const adsbCache = new Map();
const MAX_MIL_LISTED = 2000;

// Key hotspot regions for monitoring
export const HOTSPOTS = {
  middleEast: { lamin: 12, lomin: 30, lamax: 42, lomax: 65, label: 'Middle East' },
  taiwan: { lamin: 20, lomin: 115, lamax: 28, lomax: 125, label: 'Taiwan Strait' },
  ukraine: { lamin: 44, lomin: 22, lamax: 53, lomax: 41, label: 'Ukraine Region' },
  baltics: { lamin: 53, lomin: 19, lamax: 60, lomax: 29, label: 'Baltic Region' },
  southChinaSea: { lamin: 5, lomin: 105, lamax: 23, lomax: 122, label: 'South China Sea' },
  koreanPeninsula: { lamin: 33, lomin: 124, lamax: 43, lomax: 132, label: 'Korean Peninsula' },
  caribbean: { lamin: 18, lomin: -90, lamax: 30, lomax: -72, label: 'Caribbean' },
  gulfOfGuinea: { lamin: -2, lomin: -5, lamax: 8, lomax: 10, label: 'Gulf of Guinea' },
  capeRoute: { lamin: -38, lomin: 12, lamax: -28, lomax: 24, label: 'Cape Route' },
  hornOfAfrica: { lamin: 5, lomin: 40, lamax: 15, lomax: 55, label: 'Horn of Africa' },
};

// ---------- ICAO 24-bit address allocation -> state of registry (ICAO Annex 10, Vol III) ----------
// Used to attribute adsb.lol aircraft (which carry no country field) the same way OpenSky does.
const ICAO_BLOCKS = [
  [0x008000, 0x00FFFF, 'South Africa'], [0x010000, 0x017FFF, 'Egypt'], [0x018000, 0x01FFFF, 'Libya'],
  [0x020000, 0x027FFF, 'Morocco'], [0x028000, 0x028FFF, 'Tunisia'], [0x040000, 0x040FFF, 'Ethiopia'],
  [0x044000, 0x044FFF, 'Ghana'], [0x04C000, 0x04CFFF, 'Kenya'], [0x064000, 0x064FFF, 'Nigeria'],
  [0x06A000, 0x06AFFF, 'Qatar'], [0x078000, 0x078FFF, 'Somalia'], [0x07C000, 0x07CFFF, 'Sudan'],
  [0x090000, 0x090FFF, 'Angola'], [0x098000, 0x0983FF, 'Djibouti'], [0x0A0000, 0x0A7FFF, 'Algeria'],
  [0x0AC000, 0x0ACFFF, 'Colombia'], [0x0B0000, 0x0B7FFF, 'Cuba'], [0x0C0000, 0x0C0FFF, 'Panama'],
  [0x0C4000, 0x0C4FFF, 'Dominican Republic'], [0x0D0000, 0x0D7FFF, 'Mexico'], [0x0D8000, 0x0DFFFF, 'Venezuela'],
  [0x100000, 0x1FFFFF, 'Russian Federation'], [0x202000, 0x2023FF, 'Eritrea'],
  [0x300000, 0x33FFFF, 'Italy'], [0x340000, 0x37FFFF, 'Spain'], [0x380000, 0x3BFFFF, 'France'],
  [0x3C0000, 0x3FFFFF, 'Germany'], [0x400000, 0x43FFFF, 'United Kingdom'], [0x440000, 0x447FFF, 'Austria'],
  [0x448000, 0x44FFFF, 'Belgium'], [0x450000, 0x457FFF, 'Bulgaria'], [0x458000, 0x45FFFF, 'Denmark'],
  [0x460000, 0x467FFF, 'Finland'], [0x468000, 0x46FFFF, 'Greece'], [0x470000, 0x477FFF, 'Hungary'],
  [0x478000, 0x47FFFF, 'Norway'], [0x480000, 0x487FFF, 'Netherlands'], [0x488000, 0x48FFFF, 'Poland'],
  [0x490000, 0x497FFF, 'Portugal'], [0x498000, 0x49FFFF, 'Czech Republic'], [0x4A0000, 0x4A7FFF, 'Romania'],
  [0x4A8000, 0x4AFFFF, 'Sweden'], [0x4B0000, 0x4B7FFF, 'Switzerland'], [0x4B8000, 0x4BFFFF, 'Turkey'],
  [0x4C0000, 0x4C7FFF, 'Serbia'], [0x4C8000, 0x4C83FF, 'Cyprus'], [0x4CA000, 0x4CAFFF, 'Ireland'],
  [0x4CC000, 0x4CCFFF, 'Iceland'], [0x4D0000, 0x4D03FF, 'Luxembourg'], [0x4D2000, 0x4D23FF, 'Malta'],
  [0x501000, 0x5013FF, 'Albania'], [0x501C00, 0x501FFF, 'Croatia'], [0x502C00, 0x502FFF, 'Latvia'],
  [0x503C00, 0x503FFF, 'Lithuania'], [0x504C00, 0x504FFF, 'Moldova'], [0x505C00, 0x505FFF, 'Slovakia'],
  [0x506C00, 0x506FFF, 'Slovenia'], [0x507C00, 0x507FFF, 'Uzbekistan'], [0x508000, 0x50FFFF, 'Ukraine'],
  [0x510000, 0x5103FF, 'Belarus'], [0x511000, 0x5113FF, 'Estonia'], [0x512000, 0x5123FF, 'North Macedonia'],
  [0x513000, 0x5133FF, 'Bosnia and Herzegovina'], [0x514000, 0x5143FF, 'Georgia'], [0x515000, 0x5153FF, 'Tajikistan'],
  [0x516000, 0x5163FF, 'Montenegro'], [0x600000, 0x6003FF, 'Armenia'], [0x600800, 0x600BFF, 'Azerbaijan'],
  [0x601800, 0x601BFF, 'Turkmenistan'], [0x601C00, 0x601FFF, 'Kyrgyzstan'], [0x680000, 0x6803FF, 'Mongolia'],
  [0x683000, 0x6833FF, 'Kazakhstan'], [0x700000, 0x700FFF, 'Afghanistan'], [0x702000, 0x702FFF, 'Bangladesh'],
  [0x704000, 0x704FFF, 'Myanmar'], [0x706000, 0x706FFF, 'Kuwait'], [0x70A000, 0x70AFFF, 'Nepal'],
  [0x70C000, 0x70C3FF, 'Oman'], [0x710000, 0x717FFF, 'Saudi Arabia'], [0x718000, 0x71FFFF, 'Republic of Korea'],
  [0x720000, 0x727FFF, 'North Korea'], [0x728000, 0x72FFFF, 'Iraq'], [0x730000, 0x737FFF, 'Iran'],
  [0x738000, 0x73FFFF, 'Israel'], [0x740000, 0x747FFF, 'Jordan'], [0x748000, 0x74FFFF, 'Lebanon'],
  [0x750000, 0x757FFF, 'Malaysia'], [0x758000, 0x75FFFF, 'Philippines'], [0x760000, 0x767FFF, 'Pakistan'],
  [0x768000, 0x76FFFF, 'Singapore'], [0x770000, 0x777FFF, 'Sri Lanka'], [0x778000, 0x77FFFF, 'Syria'],
  [0x780000, 0x7BFFFF, 'China'], [0x7C0000, 0x7FFFFF, 'Australia'], [0x800000, 0x83FFFF, 'India'],
  [0x840000, 0x87FFFF, 'Japan'], [0x880000, 0x887FFF, 'Thailand'], [0x888000, 0x88FFFF, 'Viet Nam'],
  [0x890000, 0x890FFF, 'Yemen'], [0x894000, 0x894FFF, 'Bahrain'], [0x896000, 0x896FFF, 'United Arab Emirates'],
  [0x899000, 0x8993FF, 'Taiwan'], [0x8A0000, 0x8A7FFF, 'Indonesia'],
  [0xA00000, 0xAFFFFF, 'United States'], [0xC00000, 0xC3FFFF, 'Canada'], [0xC80000, 0xC87FFF, 'New Zealand'],
  [0xE00000, 0xE3FFFF, 'Argentina'], [0xE40000, 0xE7FFFF, 'Brazil'], [0xE80000, 0xE80FFF, 'Chile'],
  [0xE84000, 0xE84FFF, 'Peru'],
];

export function countryFromHex(hex) {
  const n = parseInt(String(hex || '').trim(), 16);
  if (!Number.isFinite(n)) return 'Unknown';
  for (const [lo, hi, name] of ICAO_BLOCKS) if (n >= lo && n <= hi) return name;
  return 'Unknown';
}

// ---------- OpenSky ----------

let tokenCache = { value: null, expires: 0 };

async function openSkyToken() {
  const id = process.env.OPENSKY_CLIENT_ID, secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (tokenCache.value && Date.now() < tokenCache.expires - 60000) return tokenCache.value;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...RELAY_HEADERS },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`OpenSky token ${res.status}`);
  const data = await res.json();
  tokenCache = { value: data.access_token, expires: Date.now() + (data.expires_in || 1800) * 1000 };
  return tokenCache.value;
}

/** One global state-vector snapshot (4 credits). Returns { states, auth } or { error }. */
export async function getAllFlights() {
  let headers = { ...RELAY_HEADERS };
  let auth = 'anonymous';
  try {
    const token = await openSkyToken();
    if (token) { headers.Authorization = `Bearer ${token}`; auth = 'account'; }
  } catch (e) {
    return { error: e.message, auth: 'account' };
  }
  const data = await safeFetch(`${BASE}/states/all`, { timeout: 14000, retries: 0, headers });
  if (data?.error) return { error: data.error, auth };
  if (!Array.isArray(data?.states)) return { error: 'no states in response', auth };
  return { states: data.states, auth: RELAY ? `${auth} via relay` : auth, time: data.time };
}

// Kept for callers that want a single box; costs credits, so briefing() does not use it.
export async function getFlightsInArea(lamin, lomin, lamax, lomax) {
  const params = new URLSearchParams({ lamin: String(lamin), lomin: String(lomin), lamax: String(lamax), lomax: String(lomax) });
  return safeFetch(`${BASE}/states/all?${params}`, { timeout: 14000, retries: 0, headers: RELAY_HEADERS });
}

export async function getFlightsByIcao(icao24List) {
  const icao = Array.isArray(icao24List) ? icao24List : [icao24List];
  return safeFetch(`${BASE}/states/all?${icao.map(i => `icao24=${i}`).join('&')}`, { timeout: 14000, retries: 0, headers: RELAY_HEADERS });
}

export async function getDepartures(airportIcao, begin, end) {
  const params = new URLSearchParams({ airport: airportIcao, begin: String(Math.floor(begin / 1000)), end: String(Math.floor(end / 1000)) });
  return safeFetch(`${BASE}/flights/departure?${params}`, { headers: RELAY_HEADERS });
}

export async function getArrivals(airportIcao, begin, end) {
  const params = new URLSearchParams({ airport: airportIcao, begin: String(Math.floor(begin / 1000)), end: String(Math.floor(end / 1000)) });
  return safeFetch(`${BASE}/flights/arrival?${params}`, { headers: RELAY_HEADERS });
}

// OpenSky state vector -> normalised aircraft
function fromOpenSky(s) {
  return {
    hex: s[0], callsign: (s[1] || '').trim(), country: s[2] || 'Unknown',
    lon: s[5], lat: s[6], altFt: typeof s[7] === 'number' ? Math.round(s[7] / 0.3048) : null,
    onGround: !!s[8], gs: typeof s[9] === 'number' ? Math.round(s[9] * 1.94384) : null,
    track: typeof s[10] === 'number' ? Math.round(s[10]) : null, squawk: s[14] || null,
  };
}

// ---------- adsb.lol ----------

function fromAdsb(a) {
  const alt = a.alt_baro === 'ground' ? 0 : (typeof a.alt_baro === 'number' ? a.alt_baro : (typeof a.alt_geom === 'number' ? a.alt_geom : null));
  return {
    hex: a.hex, callsign: (a.flight || '').trim(), country: countryFromHex(a.hex),
    lon: typeof a.lon === 'number' ? a.lon : null, lat: typeof a.lat === 'number' ? a.lat : null,
    altFt: alt, onGround: a.alt_baro === 'ground', gs: typeof a.gs === 'number' ? Math.round(a.gs) : null,
    track: typeof a.track === 'number' ? Math.round(a.track) : null, squawk: a.squawk || null,
    reg: a.r || null, type: a.t || null, military: !!(a.dbFlags & 1),
  };
}

/** Global military feed (aircraft flagged military in the adsb.lol database). */
async function adsbMilitary() {
  const data = await safeFetch(`${ADSB}/mil`, { timeout: 10000, retries: 0, headers: ADSB_HEADERS });
  if (data?.error) return { error: data.error, list: [] };
  return { list: (data.ac || []).map(fromAdsb).map(a => ({ ...a, military: true })) };
}

/** adsb.lol point queries are capped at 250 nm; sample each theater with up to two circles. */
function sampleCircles(box) {
  const midLat = (box.lamin + box.lamax) / 2;
  const widthNm = (box.lomax - box.lomin) * 60 * Math.cos(midLat * Math.PI / 180);
  const circles = [];
  if (widthNm > 600) {
    const q = (box.lomax - box.lomin) / 4;
    circles.push({ lat: midLat, lon: box.lomin + q }, { lat: midLat, lon: box.lomax - q });
  } else {
    circles.push({ lat: midLat, lon: (box.lomin + box.lomax) / 2 });
  }
  const heightNm = (box.lamax - box.lamin) * 60;
  const dist = Math.max(60, Math.min(250, Math.round(Math.max(heightNm, widthNm / circles.length) / 2)));
  return circles.map(c => ({ ...c, dist }));
}

/**
 * Sample theaters through adsb.lol one request at a time, ADSB_GAP_MS apart, most-stale theater first,
 * until the deadline. Theaters not reached this sweep reuse their last sample if it is under an hour old.
 */
async function adsbSampleAll(entries, deadline, startAfter = 0) {
  const order = [...entries].sort((a, b) => (adsbCache.get(a[0])?.at || 0) - (adsbCache.get(b[0])?.at || 0));
  let last = startAfter;
  for (const [key, box] of order) {
    const wait = last + ADSB_GAP_MS - Date.now();
    if (Date.now() + Math.max(0, wait) > deadline - 3000) break;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    last = Date.now();
    const c = sampleCircles(box)[0];
    const data = await safeFetch(`${ADSB}/lat/${c.lat.toFixed(2)}/lon/${c.lon.toFixed(2)}/dist/${c.dist}`,
      { timeout: Math.max(3000, Math.min(10000, deadline - Date.now())), retries: 0, headers: ADSB_HEADERS });
    if (data?.error || !Array.isArray(data?.ac)) {
      adsbCache.set(key, { ...(adsbCache.get(key) || { list: [] }), lastError: data?.error || 'bad response', at: adsbCache.get(key)?.at || 0 });
      continue;
    }
    const seen = new Map();
    for (const a of data.ac) if (a.hex && !seen.has(a.hex)) seen.set(a.hex, fromAdsb(a));
    adsbCache.set(key, { list: [...seen.values()], at: Date.now(), lastError: null });
  }
  return entries.map(([key]) => {
    const c = adsbCache.get(key);
    const fresh = c && c.at && Date.now() - c.at < ADSB_CACHE_MAX_MS;
    return { key, list: fresh ? c.list : [], sampledAt: fresh ? new Date(c.at).toISOString() : null, error: c?.lastError || null };
  });
}

// ---------- Aggregation ----------

const inBox = (box, a) => typeof a.lat === 'number' && typeof a.lon === 'number'
  && a.lat >= box.lamin && a.lat <= box.lamax && a.lon >= box.lomin && a.lon <= box.lomax;

function summarize(key, box, list, via, mil) {
  const byCountry = {};
  for (const a of list) byCountry[a.country] = (byCountry[a.country] || 0) + 1;
  return {
    region: box.label,
    key,
    totalAircraft: list.length,
    byCountry,
    noCallsign: list.filter(a => !a.callsign).length,
    highAltitude: list.filter(a => a.altFt != null && a.altFt > 39000).length,
    military: mil.length,
    militaryTop: mil.slice(0, 8).map(a => ({ hex: a.hex, callsign: a.callsign, type: a.type, country: a.country, altFt: a.altFt })),
    via,
  };
}

export async function briefing() {
  const started = Date.now();
  const deadline = started + BUDGET_MS;
  const entries = Object.entries(HOTSPOTS);

  // OpenSky and the adsb.lol military feed run together; the paced theater samples only run if OpenSky failed
  const milStarted = Date.now();
  const [osRes, milRes] = await Promise.all([
    getAllFlights().catch(e => ({ error: e.message })),
    adsbMilitary().catch(e => ({ error: e.message, list: [] })),
  ]);
  const samples = osRes.states
    ? entries.map(([key]) => ({ key, list: [], sampledAt: null, error: null }))
    : await adsbSampleAll(entries, deadline, milStarted).catch(() => entries.map(([key]) => ({ key, list: [], sampledAt: null, error: 'sampler failed' })));

  const osStates = osRes.states ? osRes.states.map(fromOpenSky) : null;
  const milAll = milRes.list.filter(a => a.lat != null);

  const hotspots = entries.map(([key, box]) => {
    const mil = milAll.filter(a => inBox(box, a)).sort((a, b) => (b.altFt || 0) - (a.altFt || 0));
    if (osStates) return summarize(key, box, osStates.filter(a => inBox(box, a)), 'OpenSky', mil);
    const s = samples.find(x => x.key === key) || { list: [], sampledAt: null, error: null };
    const merged = new Map(s.list.map(a => [a.hex, a]));
    for (const a of mil) if (!merged.has(a.hex)) merged.set(a.hex, a);
    const h = summarize(key, box, [...merged.values()], merged.size ? 'adsb.lol' : 'none', mil);
    if (s.sampledAt) { h.coverage = 'sampled'; h.sampledAt = s.sampledAt; }   // one 250 nm circle, not the whole theater
    else h.note = s.error ? `adsb.lol: ${s.error}` : 'not yet sampled this rotation';
    return h;
  });

  const viaOpenSky = Boolean(osStates);
  const source = viaOpenSky ? `OpenSky (${osRes.auth})` : (hotspots.some(h => h.totalAircraft) ? 'adsb.lol (OpenSky unavailable)' : 'none');
  const signals = [];
  if (viaOpenSky) signals.push(`OpenSky global snapshot: ${osStates.length.toLocaleString()} aircraft (${osRes.auth} access)`);
  else {
    const sampled = hotspots.filter(h => h.sampledAt).length;
    signals.push(`OpenSky unavailable (${osRes.error || 'no data'}) — ${sampled}/${hotspots.length} theaters sampled via adsb.lol${process.env.OPENSKY_CLIENT_ID ? '' : '; set OPENSKY_CLIENT_ID/SECRET for full coverage'}`);
  }
  if (milAll.length) {
    const top = {};
    for (const a of milAll) top[a.country] = (top[a.country] || 0) + 1;
    const lead = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} ${n}`).join(', ');
    signals.push(`${milAll.length} military aircraft broadcasting worldwide — ${lead}`);
  }

  return {
    source,
    timestamp: new Date().toISOString(),
    openSky: { ok: viaOpenSky, auth: osRes.auth || 'anonymous', error: osRes.error || null, aircraft: osStates?.length || 0 },
    hotspots,
    military: milAll.slice(0, MAX_MIL_LISTED),
    militaryTotal: milAll.length,
    militaryError: milRes.error || null,
    signals,
    durationMs: Date.now() - started,
    ...(viaOpenSky ? {} : { note: 'OpenSky throttled; theaters sampled via adsb.lol' }),
  };
}

if (process.argv[1]?.endsWith('opensky.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
