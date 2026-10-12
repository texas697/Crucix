// NASA FIRMS — Fire Information for Resource Management System
// Detects active fires/thermal anomalies globally within 3 hours of satellite pass.
// Detects military strikes, explosions, wildfires, industrial fires.

import '../utils/env.mjs';

const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
const UA = 'Crucix/2.0 (MFB Services Intelligence dashboard; +https://crucix-intel-41718.firebaseapp.com)';

// Keyless path: NASA publishes the last 24 h of VIIRS active-fire detections as plain CSV downloads (no MAP_KEY,
// ~10 MB each, refreshed continuously). Both VIIRS satellites are fetched so each region gets two passes a day.
const PUBLIC_BASE = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire';
const PUBLIC_FEEDS = [
  { id: 'VIIRS_SNPP', label: 'Suomi NPP VIIRS', path: 'suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv' },
  { id: 'VIIRS_NOAA20', label: 'NOAA-20 VIIRS', path: 'noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv' },
];
const PUBLIC_TIMEOUT_MS = parseInt(process.env.FIRMS_PUBLIC_TIMEOUT_MS) || 22000;

// Parse FIRMS CSV response into structured data
function parseCSV(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim(); });
    return obj;
  });
}

// Fetch fires in a bounding box
async function fetchFires(opts = {}) {
  const {
    west = -180, south = -90, east = 180, north = 90,
    days = 1,
    source = 'VIIRS_SNPP_NRT',
  } = opts;

  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return { error: 'No FIRMS_MAP_KEY' };

  const url = `${FIRMS_BASE}/${key}/${source}/${west},${south},${east},${north}/${days}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Crucix/1.0' },
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const text = await res.text();
    return parseCSV(text);
  } catch (e) {
    clearTimeout(timer);
    return { error: e.message };
  }
}

// Fetch one public 24 h global file: { rows, lastModified } or { error }
async function fetchPublicFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLIC_TIMEOUT_MS);
  try {
    const res = await fetch(`${PUBLIC_BASE}/${feed.path}`, { signal: controller.signal, headers: { 'User-Agent': UA } });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const text = await res.text();
    return { rows: parseCSV(text), lastModified: res.headers.get('last-modified') || null, bytes: text.length };
  } catch (e) {
    clearTimeout(timer);
    return { error: e.name === 'AbortError' ? `timeout after ${PUBLIC_TIMEOUT_MS} ms` : e.message };
  }
}

function inBox(f, box) {
  const lat = parseFloat(f.latitude), lon = parseFloat(f.longitude);
  return lat >= box.south && lat <= box.north && lon >= box.west && lon <= box.east;
}

// Key conflict/hotspot zones
const HOTSPOTS = {
  middleEast: { west: 30, south: 12, east: 65, north: 42, label: 'Middle East' },
  ukraine: { west: 22, south: 44, east: 41, north: 53, label: 'Ukraine' },
  iran: { west: 44, south: 25, east: 63, north: 40, label: 'Iran' },
  sudanHorn: { west: 21, south: 2, east: 52, north: 23, label: 'Sudan / Horn of Africa' },
  myanmar: { west: 92, south: 9, east: 102, north: 29, label: 'Myanmar' },
  southAsia: { west: 60, south: 5, east: 98, north: 37, label: 'South Asia' },
};

// Analyze fire detections for potential military/strike activity
function analyzeFires(fires, regionLabel) {
  if (!Array.isArray(fires) || fires.length === 0) {
    return { region: regionLabel, totalDetections: 0, highConfidence: 0, highIntensity: [], summary: 'No detections' };
  }

  const highConf = fires.filter(f => f.confidence === 'h' || f.confidence === 'high');
  const nomConf = fires.filter(f => f.confidence === 'n' || f.confidence === 'nominal');

  // High intensity fires (FRP > 10 MW) — potential strikes, industrial fires, large explosions
  const intense = fires.filter(f => parseFloat(f.frp) > 10);
  const highIntensity = intense
    .map(f => ({
      lat: parseFloat(f.latitude),
      lon: parseFloat(f.longitude),
      brightness: parseFloat(f.bright_ti4),
      frp: parseFloat(f.frp),
      date: f.acq_date,
      time: f.acq_time,
      confidence: f.confidence,
      daynight: f.daynight,
      satellite: ({ N: 'Suomi NPP', 1: 'NOAA-20', 2: 'NOAA-21', N20: 'NOAA-20', N21: 'NOAA-21' })[f.satellite] || f.satellite || null,
    }))
    .sort((a, b) => b.frp - a.frp)
    .slice(0, 20);

  // Night detections are more significant (less likely agricultural burning)
  const nightFires = fires.filter(f => f.daynight === 'N');

  return {
    region: regionLabel,
    totalDetections: fires.length,
    highConfidence: highConf.length,
    nominalConfidence: nomConf.length,
    nightDetections: nightFires.length,
    highIntensityCount: intense.length,
    highIntensity,
    avgFRP: fires.reduce((sum, f) => sum + (parseFloat(f.frp) || 0), 0) / fires.length,
  };
}

// Briefing
export async function briefing() {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return briefingPublic();

  // Fetch all hotspots in parallel
  const entries = Object.entries(HOTSPOTS);
  const rawResults = await Promise.all(
    entries.map(async ([key, box]) => {
      const fires = await fetchFires({ ...box, days: 2 });
      return { key, label: box.label, fires };
    })
  );

  const hotspots = rawResults.map(r => {
    if (r.fires?.error) return { region: r.label, error: r.fires.error };
    return analyzeFires(r.fires, r.label);
  });

  // Generate signals
  const signals = [];
  for (const h of hotspots) {
    if (h.highIntensity?.length > 5) {
      signals.push(`HIGH INTENSITY FIRES in ${h.region}: ${h.highIntensity.length} detections >10MW FRP`);
    }
    if (h.nightDetections > 20) {
      signals.push(`ELEVATED NIGHT ACTIVITY in ${h.region}: ${h.nightDetections} night detections (potential strikes/combat)`);
    }
  }

  return {
    source: 'NASA FIRMS',
    timestamp: new Date().toISOString(),
    status: 'active',
    access: 'api',
    window: '48h',
    hotspots,
    signals,
  };
}

// Signals for the 24 h global feed. The region boxes are large and always contain agricultural and wildfire
// burning, so absolute thresholds fire everywhere; flag only unusually intense or night-heavy regions.
function signalsFor(hotspots) {
  const signals = [];
  for (const h of hotspots) {
    if (!h.totalDetections) continue;
    const nightShare = h.nightDetections / h.totalDetections;
    if (h.highIntensityCount >= 100) {
      signals.push(`HIGH INTENSITY FIRES in ${h.region}: ${h.highIntensityCount} detections >10 MW FRP in 24 h`);
    }
    if (nightShare >= 0.5 && h.nightDetections >= 300) {
      signals.push(`NIGHT-HEAVY THERMAL ACTIVITY in ${h.region}: ${h.nightDetections} of ${h.totalDetections} detections at night (${Math.round(nightShare * 100)}%; strikes, flaring or combat rather than daytime burning)`);
    }
  }
  return signals;
}

// Keyless briefing from the public 24 h global files
async function briefingPublic() {
  const started = Date.now();
  const feeds = await Promise.all(PUBLIC_FEEDS.map(async f => ({ ...f, ...(await fetchPublicFeed(f)) })));
  const ok = feeds.filter(f => Array.isArray(f.rows));
  if (!ok.length) {
    return {
      source: 'NASA FIRMS',
      timestamp: new Date().toISOString(),
      status: 'error',
      access: 'public-24h',
      error: feeds.map(f => `${f.label}: ${f.error}`).join('; '),
      message: 'Public FIRMS downloads unavailable; set FIRMS_MAP_KEY to use the keyed API instead.',
    };
  }
  const all = ok.flatMap(f => f.rows);
  const hotspots = Object.values(HOTSPOTS).map(box => analyzeFires(all.filter(f => inBox(f, box)), box.label));
  return {
    source: 'NASA FIRMS',
    timestamp: new Date().toISOString(),
    status: 'active',
    access: 'public-24h',
    window: '24h',
    satellites: ok.map(f => f.label),
    feedErrors: feeds.filter(f => f.error).map(f => `${f.label}: ${f.error}`),
    lastModified: ok.map(f => f.lastModified).filter(Boolean).sort().pop() || null,
    globalDetections: all.length,
    hotspots,
    signals: signalsFor(hotspots),
    durationMs: Date.now() - started,
  };
}

if (process.argv[1]?.endsWith('firms.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
