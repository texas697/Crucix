// KiwiSDR Network — Global software-defined radio receiver network
// No auth required. ~900 public HF receivers worldwide (0-30 MHz).
// Useful for SIGINT awareness: HF band activity, receiver distribution,
// detecting unusual radio configurations in conflict zones.
// Data source: receiverbook.de directory (embeds the receiver list as a JS variable) + each receiver's own /status
// endpoint for live state inside the regions of interest.

import { safeFetch } from '../utils/fetch.mjs';

const RECEIVERBOOK_URL = 'https://www.receiverbook.de/map?type=kiwisdr';

const UA = 'Crucix/2.0 (MFB Services Intelligence dashboard; +https://crucix-intel-41718.firebaseapp.com)';
const STATUS_TIMEOUT_MS = parseInt(process.env.KIWISDR_STATUS_TIMEOUT_MS) || 6000;
const STATUS_BUDGET_MS = parseInt(process.env.KIWISDR_STATUS_BUDGET_MS) || 16000;
const STATUS_CONCURRENCY = 10;

// receiverbook labels end in a country most of the time, but some end in a US state, a city or a free-text antenna
// description. Normalise the common cases and blank the rest rather than report "HASENBERG AG 700M" as a country.
const US_STATES = new Set(['alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming']);
const COUNTRY_ALIASES = { 'usa': 'USA', 'us': 'USA', 'united states': 'USA', 'united states of america': 'USA', 'uk': 'UK', 'united kingdom': 'UK', 'england': 'UK', 'scotland': 'UK', 'wales': 'UK', 'the netherlands': 'Netherlands', 'holland': 'Netherlands', 'deutschland': 'Germany', 'republic of korea': 'South Korea', 'rep. of korea': 'South Korea', 'korea': 'South Korea', 'taiwan, china': 'Taiwan', 'russian federation': 'Russia', 'czechia': 'Czech Republic', 'new south wales': 'Australia', 'queensland': 'Australia', 'victoria': 'Australia', 'south australia': 'Australia', 'western australia': 'Australia', 'tasmania': 'Australia' };
// Country names (and a few demonyms/abbreviations) searched anywhere in a label when the last segment is not a country.
const COUNTRY_SCAN = [['USA',/\b(usa|u\.s\.a\.|united states)\b/i],['UK',/\b(uk|united kingdom|england|scotland|wales)\b/i],['Germany',/\b(germany|deutschland|germa)\b/i],['Switzerland',/\b(switzerland|schweiz|suisse)\b/i],['Austria',/\b(austria|österreich)\b/i],['Netherlands',/\b(netherlands|holland|nederland)\b/i],['Belgium',/\bbelgi(um|ë|que)\b/i],['France',/\bfrance\b/i],['Italy',/\b(italy|italia)\b/i],['Spain',/\b(spain|españa)\b/i],['Portugal',/\bportugal\b/i],['Finland',/\b(finland|suomi)\b/i],['Sweden',/\b(sweden|sverige)\b/i],['Norway',/\b(norway|norge)\b/i],['Denmark',/\b(denmark|danmark)\b/i],['Poland',/\b(poland|polska)\b/i],['Czech Republic',/\b(czech|czechia)\b/i],['Slovakia',/\bslovakia\b/i],['Hungary',/\bhungary\b/i],['Romania',/\bromania\b/i],['Bulgaria',/\bbulgaria\b/i],['Greece',/\bgreece\b/i],['Cyprus',/\bcyprus\b/i],['Ireland',/\bireland\b/i],['Iceland',/\biceland\b/i],['Estonia',/\bestonia\b/i],['Latvia',/\blatvia\b/i],['Lithuania',/\blithuania\b/i],['Ukraine',/\bukraine\b/i],['Russia',/\brussia\b/i],['Turkey',/\b(turkey|türkiye)\b/i],['Israel',/\bisrael\b/i],['Qatar',/\bqatar\b/i],['Iraq',/\biraq\b/i],['UAE',/\b(uae|emirates|dubai)\b/i],['Japan',/\bjapan\b/i],['South Korea',/\bkorea\b/i],['Taiwan',/\btaiwan\b/i],['Hong Kong',/\bhong kong\b/i],['China',/\bchina\b/i],['Philippines',/\b(philippines|manila)\b/i],['Thailand',/\bthailand\b/i],['Malaysia',/\bmalaysia\b/i],['Indonesia',/\bindonesia\b/i],['India',/\bindia\b/i],['Australia',/\baustralia\b/i],['New Zealand',/\bnew zealand\b/i],['Canada',/\bcanada\b/i],['Mexico',/\bmexico\b/i],['Brazil',/\b(brazil|brasil)\b/i],['Argentina',/\bargentina\b/i],['Chile',/\bchile\b/i],['South Africa',/\bsouth africa\b/i],['Kenya',/\bkenya\b/i],['Luxembourg',/\bluxembourg\b/i],['Slovenia',/\bslovenia\b/i],['Croatia',/\bcroatia\b/i],['Serbia',/\bserbia\b/i],['Malta',/\bmalta\b/i]];
function cleanCountry(label) {
  const text = String(label || '');
  const parts = text.split(/[,|]/).map(x => x.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const c = parts[parts.length - 1].replace(/[.!]+$/, '').trim();
    const key = c.toLowerCase();
    if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
    if (US_STATES.has(key)) return 'USA';
    if (!/\d/.test(c) && c.length <= 24 && c.split(' ').length <= 3 && COUNTRY_SCAN.some(([, re]) => re.test(c))) return c.replace(/\b\w/g, ch => ch.toUpperCase());
  }
  for (const [name, re] of COUNTRY_SCAN) if (re.test(text)) return name;
  for (const st of US_STATES) if (new RegExp(`\\b${st}\\b`, 'i').test(text)) return 'USA';
  return '';
}

// Fetch the full list of public KiwiSDR receivers from receiverbook.de (a directory: name, position, URL; no live status)
export async function getAllReceivers() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(RECEIVERBOOK_URL, {
      headers: { 'User-Agent': UA },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const html = await res.text();
    // Extract embedded JS: var receivers = [...];
    const match = html.match(/var\s+receivers\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return { error: 'Could not parse receiver data from page' };
    const sites = JSON.parse(match[1]);
    // Flatten: each site has a .receivers[] array of individual SDRs
    const flat = [];
    for (const site of sites) {
      const [lon, lat] = site.location?.coordinates || [NaN, NaN];
      const country = cleanCountry(site.label);
      for (const rx of (site.receivers || [site])) {
        flat.push({
          name: rx.label || site.label || '',
          location: site.label || '',
          lat, lon,
          country,
          url: rx.url || site.url || '',
          version: rx.version || '',
          antenna: '',
          users: 0, usersMax: 0,
          offline: false,
          snr: NaN,
          tdoa: null,
          bands: '',
        });
      }
    }
    return flat;
  } catch (e) {
    return { error: e.message };
  }
}

// Every KiwiSDR answers GET /status with key=value lines (status, offline, name, users, users_max, gps, antenna, snr…).
// Probing the whole directory each sweep is too slow, so only receivers inside the regions of interest are probed.
function parseStatus(text) {
  const kv = {};
  for (const line of String(text).split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) kv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!kv.status && !kv.name) return null;
  const gps = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/.exec(kv.gps || '');
  const snr = /(\d+)\s*,\s*(\d+)/.exec(kv.snr || '');
  return {
    status: kv.status || 'unknown',                 // active | private | ...
    offline: kv.offline === 'yes',
    auth: kv.auth || null,
    name: (kv.name || '').slice(0, 100),
    hw: (kv.sdr_hw || '').replace(/[^\x20-\x7e]+.*$/, '').trim().slice(0, 40),
    users: parseInt(kv.users) || 0,
    usersMax: parseInt(kv.users_max) || 0,
    antenna: (kv.antenna || '').slice(0, 80),
    snr: snr ? { all: parseInt(snr[1]), hf: parseInt(snr[2]) } : null,
    gpsGood: parseInt(kv.gps_good) || 0,
    gps: gps ? { lat: parseFloat(gps[1]), lon: parseFloat(gps[2]) } : null,
    uptime: parseInt(kv.uptime) || null,
  };
}

export async function probeReceiver(url) {
  const base = String(url || '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(base)) return { reachable: false, error: 'no url' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/status`, { signal: controller.signal, headers: { 'User-Agent': UA }, redirect: 'follow' });
    clearTimeout(timer);
    if (!res.ok) return { reachable: false, error: `HTTP ${res.status}` };
    const parsed = parseStatus(await res.text());
    if (!parsed) return { reachable: false, error: 'no status body' };
    return { reachable: true, ...parsed };
  } catch (e) {
    clearTimeout(timer);
    return { reachable: false, error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message) };
  }
}

async function probeAll(receivers) {
  const deadline = Date.now() + STATUS_BUDGET_MS;
  const results = new Map();
  let i = 0;
  async function worker() {
    while (i < receivers.length && Date.now() < deadline) {
      const rx = receivers[i++];
      results.set(rx.url, await probeReceiver(rx.url));
    }
  }
  await Promise.all(Array.from({ length: Math.min(STATUS_CONCURRENCY, receivers.length) }, worker));
  return results;
}

// Regions of intelligence interest with bounding boxes
const REGIONS_OF_INTEREST = {
  middleEast:     { lamin: 12, lomin: 30, lamax: 42, lomax: 65, label: 'Middle East' },
  ukraine:        { lamin: 44, lomin: 22, lamax: 53, lomax: 41, label: 'Ukraine / Eastern Europe' },
  taiwan:         { lamin: 20, lomin: 115, lamax: 28, lomax: 125, label: 'Taiwan Strait' },
  baltics:        { lamin: 53, lomin: 19, lamax: 60, lomax: 29, label: 'Baltic Region' },
  southChinaSea:  { lamin: 5, lomin: 105, lamax: 23, lomax: 122, label: 'South China Sea' },
  koreanPeninsula:{ lamin: 33, lomin: 124, lamax: 43, lomax: 132, label: 'Korean Peninsula' },
  iran:           { lamin: 25, lomin: 44, lamax: 40, lomax: 63, label: 'Iran' },
  sahel:          { lamin: 10, lomin: -17, lamax: 20, lomax: 25, label: 'Sahel / West Africa' },
};

// HF band classifications for intelligence relevance
const HF_BANDS = {
  vlf:       { min: 0,     max: 0.3,  label: 'VLF (submarine/military comms)' },
  lf:        { min: 0.3,   max: 0.5,  label: 'LF (navigation/time signals)' },
  mf:        { min: 0.5,   max: 1.8,  label: 'MF (AM broadcast/maritime)' },
  hf160m:    { min: 1.8,   max: 2.0,  label: '160m amateur' },
  hf80m:     { min: 3.5,   max: 4.0,  label: '80m amateur' },
  hf60m:     { min: 5.3,   max: 5.4,  label: '60m amateur/utility' },
  hf49m:     { min: 5.9,   max: 6.2,  label: '49m shortwave broadcast' },
  hf40m:     { min: 7.0,   max: 7.3,  label: '40m amateur' },
  hf31m:     { min: 9.4,   max: 9.9,  label: '31m shortwave broadcast' },
  hf30m:     { min: 10.1,  max: 10.15,label: '30m amateur' },
  hf25m:     { min: 11.6,  max: 12.1, label: '25m shortwave broadcast' },
  hf20m:     { min: 14.0,  max: 14.35,label: '20m amateur' },
  hf17m:     { min: 18.068,max: 18.168,label: '17m amateur' },
  hf15m:     { min: 21.0,  max: 21.45,label: '15m amateur' },
  hf11m:     { min: 25.67, max: 26.1, label: '11m broadcast/CB' },
  hfMilitary:{ min: 2.0,   max: 30.0, label: 'HF military/utility (general)' },
};

// Check if a receiver falls within a bounding box
function inBounds(rx, box) {
  if (isNaN(rx.lat) || isNaN(rx.lon)) return false;
  return rx.lat >= box.lamin && rx.lat <= box.lamax && rx.lon >= box.lomin && rx.lon <= box.lomax;
}

// Map a receiver to a continent based on coordinates
function getContinent(lat, lon) {
  if (isNaN(lat) || isNaN(lon)) return 'Unknown';
  if (lat >= 15 && lat <= 72 && lon >= -170 && lon <= -50) return 'North America';
  if (lat >= -60 && lat < 15 && lon >= -90 && lon <= -30) return 'South America';
  if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 45) return 'Europe';
  if (lat >= -35 && lat <= 37 && lon >= -25 && lon <= 55) return 'Africa';
  if (lat >= 0 && lat <= 72 && lon >= 45 && lon <= 180) return 'Asia';
  if (lat >= -50 && lat <= 0 && lon >= 95 && lon <= 180) return 'Oceania';
  if (lat >= 35 && lat < 45 && lon >= 25 && lon <= 45) return 'Middle East';
  return 'Other';
}

// Classify the frequency range of a receiver
function classifyFrequency(rx) {
  // KiwiSDR receivers typically cover 0-30 MHz
  // Some entries have frequency info in various fields
  const maxFreq = parseFloat(rx.max_freq ?? rx.sdr_hu?.max_freq ?? 30);
  const minFreq = parseFloat(rx.min_freq ?? rx.sdr_hu?.min_freq ?? 0);
  return { minFreq, maxFreq };
}

// Normalize receiver data (already flat from getAllReceivers)
function normalizeReceiver(rx, idx) {
  return {
    name: (rx.name || `Receiver-${idx}`).slice(0, 100),
    location: (rx.location || '').slice(0, 80),
    lat: parseFloat(rx.lat) || NaN,
    lon: parseFloat(rx.lon) || NaN,
    users: parseInt(rx.users ?? 0, 10),
    usersMax: parseInt(rx.usersMax ?? 0, 10),
    antenna: (rx.antenna || '').slice(0, 80),
    bands: (rx.bands || '').slice(0, 60),
    offline: rx.offline === true,
    snr: parseFloat(rx.snr ?? NaN),
    tdoa: rx.tdoa ?? null,
    country: rx.country || '',
    url: rx.url || '',
  };
}

// Briefing — analyze the global KiwiSDR network
export async function briefing() {
  const raw = await getAllReceivers();

  // Handle errors
  if (raw?.error) {
    return {
      source: 'KiwiSDR',
      timestamp: new Date().toISOString(),
      status: 'error',
      message: raw.error,
    };
  }

  // The API may return an array directly or an object with a receivers list
  let rxList;
  if (Array.isArray(raw)) {
    rxList = raw;
  } else if (raw && typeof raw === 'object') {
    // Try common keys
    rxList = raw.receivers || raw.rx || raw.sdrs || raw.data || Object.values(raw);
    // If the object values are receiver objects, flatten
    if (!Array.isArray(rxList)) {
      rxList = Object.values(raw).filter(v => v && typeof v === 'object' && !Array.isArray(v));
    }
  } else {
    return {
      source: 'KiwiSDR',
      timestamp: new Date().toISOString(),
      status: 'error',
      message: 'Unexpected data format from KiwiSDR API',
    };
  }

  // Normalize all receivers
  const allRx = rxList.map((rx, i) => normalizeReceiver(rx, i));
  const onlineRx = allRx.filter(r => !r.offline);
  const offlineRx = allRx.filter(r => r.offline);

  // --- Geographic distribution by country ---
  const byCountry = {};
  for (const rx of onlineRx) {
    const c = rx.country || 'Unknown';
    byCountry[c] = (byCountry[c] || 0) + 1;
  }
  // Sort by count descending, take top 20
  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([country, count]) => ({ country, count }));

  // --- Continental distribution ---
  const byContinent = {};
  for (const rx of onlineRx) {
    const continent = getContinent(rx.lat, rx.lon);
    byContinent[continent] = (byContinent[continent] || 0) + 1;
  }

  // --- Receivers in regions of interest: probe each one's /status for live state ---
  const zoneRx = onlineRx.filter(rx => Object.values(REGIONS_OF_INTEREST).some(box => inBounds(rx, box)));
  const probeStarted = Date.now();
  const probes = await probeAll(zoneRx);
  const probeMs = Date.now() - probeStarted;
  for (const rx of zoneRx) {
    const pr = probes.get(rx.url);
    if (!pr) { rx.live = 'unprobed'; continue; }
    rx.live = !pr.reachable ? 'unreachable' : pr.offline ? 'offline' : pr.status === 'active' ? 'online' : pr.status;
    rx.probeError = pr.error || null;
    if (pr.reachable) {
      rx.users = pr.users; rx.usersMax = pr.usersMax; rx.antenna = pr.antenna; rx.snr = pr.snr; rx.hw = pr.hw;
      rx.gpsGood = pr.gpsGood; rx.statusName = pr.name;
      if (pr.gps && Math.abs(pr.gps.lat) <= 90 && (pr.gps.lat !== 0 || pr.gps.lon !== 0)) { rx.lat = pr.gps.lat; rx.lon = pr.gps.lon; }
    }
  }
  // The directory lists some receivers under several hostnames / IPs; after probing they are recognisable by the
  // name the receiver itself reports, so keep one entry per reported name.
  const seenNames = new Set();
  const dedupedZoneRx = zoneRx.filter(rx => {
    if (!rx.statusName) return true;
    const key = rx.statusName + '|' + rx.usersMax;
    if (seenNames.has(key)) return false;
    seenNames.add(key); return true;
  });
  zoneRx.length = 0; zoneRx.push(...dedupedZoneRx);
  const probedRx = zoneRx.filter(rx => probes.has(rx.url));
  const liveOnline = zoneRx.filter(rx => rx.live === 'online');
  const livePrivate = zoneRx.filter(rx => rx.live === 'private');
  const liveDown = zoneRx.filter(rx => rx.live === 'unreachable' || rx.live === 'offline');

  const conflictZoneReceivers = {};
  for (const [key, box] of Object.entries(REGIONS_OF_INTEREST)) {
    const rxInRegion = zoneRx.filter(rx => inBounds(rx, box));
    const online = rxInRegion.filter(rx => rx.live === 'online');
    conflictZoneReceivers[key] = {
      region: box.label,
      count: rxInRegion.length,
      online: online.length,
      private: rxInRegion.filter(rx => rx.live === 'private').length,
      down: rxInRegion.filter(rx => rx.live === 'unreachable' || rx.live === 'offline').length,
      users: online.reduce((n, rx) => n + rx.users, 0),
      capacity: online.reduce((n, rx) => n + rx.usersMax, 0),
      receivers: rxInRegion.slice(0, 20).map(rx => ({
        name: rx.name,
        location: rx.location,
        lat: rx.lat,
        lon: rx.lon,
        url: rx.url,
        live: rx.live,
        users: rx.users,
        usersMax: rx.usersMax,
        snr: rx.snr || null,
        antenna: rx.antenna,
        hw: rx.hw || null,
        gpsGood: rx.gpsGood || 0,
        country: rx.country,
      })),
    };
  }

  // --- Activity analysis (users connected; probed receivers only) ---
  const activeRx = liveOnline
    .filter(r => r.users > 0)
    .sort((a, b) => b.users - a.users);

  const totalUsers = liveOnline.reduce((sum, r) => sum + r.users, 0);
  const totalCapacity = liveOnline.reduce((sum, r) => sum + r.usersMax, 0);

  const topActive = activeRx.slice(0, 15).map(rx => ({
    name: rx.name,
    location: rx.location,
    country: rx.country,
    users: rx.users,
    usersMax: rx.usersMax,
    lat: rx.lat,
    lon: rx.lon,
    antenna: rx.antenna,
  }));

  // --- TDOA-capable receivers (direction finding / geolocation) ---
  const tdoaCapable = liveOnline.filter(r => r.gpsGood > 0);

  // --- Antenna analysis (identify unusual/specialized setups) ---
  const antennaTypes = {};
  for (const rx of onlineRx) {
    if (rx.antenna) {
      const key = rx.antenna.toLowerCase().trim();
      antennaTypes[key] = (antennaTypes[key] || 0) + 1;
    }
  }

  // --- Utilization metrics ---
  const utilizationPct = totalCapacity > 0
    ? ((totalUsers / totalCapacity) * 100).toFixed(1)
    : '0.0';

  const highUtilization = liveOnline
    .filter(r => r.usersMax > 0 && (r.users / r.usersMax) >= 0.8)
    .map(rx => ({
      name: rx.name,
      location: rx.location,
      country: rx.country,
      users: rx.users,
      usersMax: rx.usersMax,
    }));

  // --- Generate signals (only probed receivers carry live numbers) ---
  const signals = [];
  if (probedRx.length) {
    signals.push(`${liveOnline.length} of ${probedRx.length} KiwiSDR receivers in watched regions online (${livePrivate.length} private, ${liveDown.length} unreachable); ${totalUsers} listeners on ${totalCapacity} channels`);
  }
  for (const info of Object.values(conflictZoneReceivers)) {
    if (info.capacity > 0 && info.users / info.capacity >= 0.8 && info.users >= 8) {
      signals.push(`HF LISTENING DEMAND in ${info.region}: ${info.users}/${info.capacity} receiver channels in use (${Math.round(100 * info.users / info.capacity)}%)`);
    }
    if (info.count > 0 && info.online === 0) {
      signals.push(`NO LIVE HF COVERAGE in ${info.region}: ${info.count} listed receiver${info.count > 1 ? 's' : ''}, none reachable`);
    }
  }

  return {
    source: 'KiwiSDR',
    timestamp: new Date().toISOString(),
    status: 'active',
    directory: 'receiverbook.de',
    network: {
      totalReceivers: allRx.length,
      // Live state is only known for the probed receivers inside the regions of interest.
      probed: probedRx.length,
      online: liveOnline.length,
      private: livePrivate.length,
      unreachable: liveDown.length,
      probeMs,
      totalUsers,
      totalCapacity,
      utilizationPct: parseFloat(utilizationPct),
      tdoaCapable: tdoaCapable.length,
    },
    // Compact directory for the coverage map: [name, lat, lon, country, url]
    all: onlineRx.filter(rx => !isNaN(rx.lat) && !isNaN(rx.lon)).map(rx => [rx.name.slice(0, 60), +rx.lat.toFixed(3), +rx.lon.toFixed(3), rx.country, rx.url]),
    geographic: {
      byContinent,
      topCountries,
    },
    conflictZones: conflictZoneReceivers,
    topActive,
    highUtilization: highUtilization.slice(0, 10),
    signals,
  };
}

if (process.argv[1]?.endsWith('kiwisdr.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
