// Safecast — radiation monitoring near nuclear sites.
// No auth required. CC0 public domain. Citizen-science network.
//
// Data comes from the Safecast realtime device feed (tt.safecast.org/devices): every fixed sensor in the network with
// its latest reading. One request per sweep (~1.4 MB, a few seconds). The historical measurements API
// (api.safecast.org/measurements.json) is not used any more: it returns an arbitrary 25-row sample per query with no
// usable sort order, times out or 500s on dense areas such as Fukushima, and holds no reading from the last decade
// near several sites, which is why the Nuclear watch tile showed "No data" everywhere.

import { safeFetch } from '../utils/fetch.mjs';

const DEVICES_URL = 'https://tt.safecast.org/devices';
const TIMEOUT_MS = 25000;

// A sensor counts as live when its latest reading is at most this old. Fixed sensors report every few minutes to a
// few hours, so a month is generous; it only exists to drop dead devices that still sit in the feed.
const WINDOW_DAYS = parseInt(process.env.SAFECAST_WINDOW_DAYS) || 30;

// LND tube sensitivities in CPM per µSv/h (Safecast's own conversion factors for these tubes).
const TUBES = {
  lnd_7318u: 334, lnd_7318c: 334, lnd_7128ec: 334, lnd_712u: 108, lnd_78017w: 334,
};

// Sites to watch. `radius` in km; `alertUsvh` is the median dose rate that flags the site. Normal outdoor
// background is 0.05–0.3 µSv/h (≈ 15–100 CPM on an LND 7318); the Chernobyl exclusion zone runs permanently
// higher, so its threshold is set above the historical plateau instead of at the global one.
// Sites with `coverage: 'none'` have no public sensors within reach (Iran, North Korea, Israel). They stay on the
// list so the tile says so explicitly instead of implying a reading exists.
const SITES = [
  { key: 'zaporizhzhia', label: 'Zaporizhzhia NPP (Ukraine)', lat: 47.51, lon: 34.58, radius: 100 },
  { key: 'chernobyl', label: 'Chernobyl Exclusion Zone', lat: 51.39, lon: 30.1, radius: 50, alertUsvh: 5, note: 'Elevated baseline inside the exclusion zone is expected.' },
  { key: 'rivne', label: 'Rivne NPP (Ukraine)', lat: 51.33, lon: 25.89, radius: 100 },
  { key: 'khmelnytskyi', label: 'Khmelnytskyi NPP (Ukraine)', lat: 50.30, lon: 26.65, radius: 100 },
  { key: 'south-ukraine', label: 'South Ukraine NPP', lat: 47.81, lon: 31.22, radius: 100 },
  { key: 'kursk', label: 'Kursk NPP (Russia)', lat: 51.67, lon: 35.6, radius: 150, note: 'Nearest public sensors are on the Ukrainian side of the border (Sumy region).' },
  { key: 'fukushima', label: 'Fukushima Daiichi', lat: 37.42, lon: 141.03, radius: 50 },
  { key: 'onagawa', label: 'Onagawa NPP (Japan)', lat: 38.40, lon: 141.50, radius: 100 },
  { key: 'bushehr', label: 'Bushehr NPP (Iran)', lat: 28.83, lon: 50.89, radius: 100, coverage: 'none' },
  { key: 'yongbyon', label: 'Yongbyon (North Korea)', lat: 39.8, lon: 125.75, radius: 100, coverage: 'none' },
  { key: 'dimona', label: 'Dimona (Israel)', lat: 31.0, lon: 35.15, radius: 100, coverage: 'none' },
];

const DEFAULT_ALERT_USVH = parseFloat(process.env.SAFECAST_ALERT_USVH) || 0.5;

function haversineKm(lat1, lon1, lat2, lon2) {
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2
    + Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Pull the radiation reading off a device record. Returns null for devices without a tube (air-quality nodes).
function readingOf(dev) {
  for (const [field, cpmPerUsvh] of Object.entries(TUBES)) {
    const v = dev[field];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      return { cpm: v, usvh: v / cpmPerUsvh, tube: field.replace('lnd_', 'LND ').toUpperCase() };
    }
  }
  return null;
}

// Normalize the device feed into live radiation sensors: one entry per device, newest reading wins, readings in
// the future (some devices upload with a broken clock, e.g. year 2080) or older than the window are dropped.
export function liveSensors(devices, now = Date.now()) {
  const minTs = now - WINDOW_DAYS * 86400000;
  const maxTs = now + 3600000; // tolerate an hour of clock skew
  const byDevice = new Map();
  for (const dev of Array.isArray(devices) ? devices : []) {
    const lat = dev.loc_lat, lon = dev.loc_lon;
    if (typeof lat !== 'number' || typeof lon !== 'number' || (lat === 0 && lon === 0)) continue;
    const ts = Date.parse(dev.when_captured || '');
    if (!Number.isFinite(ts) || ts < minTs || ts > maxTs) continue;
    const reading = readingOf(dev);
    if (!reading) continue;
    const id = String(dev.device ?? dev.device_urn ?? `${lat},${lon}`);
    const prev = byDevice.get(id);
    if (prev && prev.ts >= ts) continue;
    byDevice.set(id, {
      id, ts, lat, lon,
      name: dev.loc_name || dev.device_sn || id,
      country: dev.loc_country || null,
      capturedAt: new Date(ts).toISOString(),
      ...reading,
    });
  }
  return [...byDevice.values()];
}

export function siteStatus(site, sensors) {
  if (site.coverage === 'none') {
    return {
      site: site.label, key: site.key, lat: site.lat, lon: site.lon, radiusKm: site.radius,
      coverage: 'none', sensors: 0, medianCPM: null, maxCPM: null, medianUsvh: null, maxUsvh: null,
      anomaly: false, lastReading: null, nearest: null, note: site.note || null,
      windowDays: WINDOW_DAYS,
    };
  }
  const near = sensors
    .map(s => ({ ...s, distanceKm: haversineKm(site.lat, site.lon, s.lat, s.lon) }))
    .filter(s => s.distanceKm <= site.radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const cpms = near.map(s => s.cpm);
  const usvhs = near.map(s => s.usvh);
  const medianUsvh = median(usvhs);
  const threshold = site.alertUsvh ?? DEFAULT_ALERT_USVH;
  const hot = near.filter(s => s.usvh > threshold);
  return {
    site: site.label, key: site.key, lat: site.lat, lon: site.lon, radiusKm: site.radius,
    coverage: near.length ? 'live' : 'stale',
    sensors: near.length,
    medianCPM: median(cpms), maxCPM: cpms.length ? Math.max(...cpms) : null,
    medianUsvh, maxUsvh: usvhs.length ? Math.max(...usvhs) : null,
    alertUsvh: threshold,
    // Site-level anomaly: the typical sensor is above the threshold. A single hot sensor is reported but does not
    // flip the site, since one sensor can sit on a known hot spot or be faulty.
    anomaly: medianUsvh !== null && medianUsvh > threshold,
    hotSensors: hot.length,
    lastReading: near.length ? near.map(s => s.capturedAt).sort().pop() : null,
    nearest: near.length ? { name: near[0].name, distanceKm: Math.round(near[0].distanceKm), cpm: near[0].cpm, usvh: near[0].usvh, capturedAt: near[0].capturedAt } : null,
    readings: near.slice(0, 12).map(s => ({
      name: s.name, lat: s.lat, lon: s.lon, distanceKm: Math.round(s.distanceKm), cpm: s.cpm,
      usvh: Math.round(s.usvh * 1000) / 1000, tube: s.tube, capturedAt: s.capturedAt,
    })),
    note: site.note || null,
    windowDays: WINDOW_DAYS,
  };
}

// Briefing — radiation levels near key nuclear sites from live fixed sensors
export async function briefing() {
  const started = Date.now();
  const data = await safeFetch(DEVICES_URL, { timeout: TIMEOUT_MS, retries: 1 });
  if (!Array.isArray(data)) {
    const error = data?.error || 'Safecast device feed returned no device list';
    return {
      source: 'Safecast', timestamp: new Date().toISOString(), windowDays: WINDOW_DAYS, error,
      sites: SITES.map(s => siteStatus(s, [])), liveSensors: 0, signals: [`Safecast device feed unavailable: ${error}`],
    };
  }

  const sensors = liveSensors(data);
  const sites = SITES.map(s => siteStatus(s, sensors));
  const live = sites.filter(s => s.coverage === 'live');
  const anomalies = sites.filter(s => s.anomaly);
  const uncovered = sites.filter(s => s.coverage !== 'live');

  const signals = [];
  for (const a of anomalies) {
    signals.push(`ELEVATED RADIATION near ${a.site}: median ${a.medianUsvh.toFixed(2)} µSv/h (${Math.round(a.medianCPM)} CPM) across ${a.sensors} sensors, threshold ${a.alertUsvh} µSv/h`);
  }
  for (const s of live.filter(s => !s.anomaly && s.hotSensors > 0)) {
    signals.push(`${s.hotSensors} of ${s.sensors} sensors near ${s.site} above ${s.alertUsvh} µSv/h (max ${s.maxUsvh.toFixed(2)} µSv/h) while the site median is normal`);
  }
  if (live.length) {
    signals.push(`${live.length} of ${sites.length} watched nuclear sites have live Safecast sensors (${live.reduce((n, s) => n + s.sensors, 0)} sensors)${anomalies.length ? '' : ' — all site medians within normal background'}`);
  }
  if (uncovered.length) {
    signals.push(`No public radiation sensors near ${uncovered.map(s => s.site.replace(/ \(.*\)$/, '')).join(', ')}`);
  }

  return {
    source: 'Safecast',
    timestamp: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    feed: 'tt.safecast.org realtime devices',
    devicesInFeed: data.length,
    liveSensors: sensors.length,
    sites,
    signals,
    durationMs: Date.now() - started,
  };
}

if (process.argv[1]?.endsWith('safecast.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
