// Safecast — Global radiation monitoring (150M+ readings)
// No auth required. CC0 public domain. Citizen-science network.

import { safeFetch } from '../utils/fetch.mjs';

const BASE = 'https://api.safecast.org';

// Get recent measurements in an area
export async function getMeasurements(opts = {}) {
  const {
    latitude = null,
    longitude = null,
    distance = 100, // km
    limit = 50,
    since = null,
  } = opts;

  const params = new URLSearchParams({ limit: String(limit) });
  if (latitude && longitude) {
    params.set('latitude', String(latitude));
    params.set('longitude', String(longitude));
    params.set('distance', String(distance * 1000)); // meters
  }
  if (since) params.set('since', since);

  return safeFetch(`${BASE}/measurements.json?${params}`);
}

// Key nuclear sites to monitor
const NUCLEAR_SITES = {
  zaporizhzhia: { lat: 47.51, lon: 34.58, label: 'Zaporizhzhia NPP (Ukraine)', radius: 100 },
  chernobyl: { lat: 51.39, lon: 30.1, label: 'Chernobyl Exclusion Zone', radius: 50 },
  bushehr: { lat: 28.83, lon: 50.89, label: 'Bushehr NPP (Iran)', radius: 100 },
  yongbyon: { lat: 39.8, lon: 125.75, label: 'Yongbyon (North Korea)', radius: 100 },
  fukushima: { lat: 37.42, lon: 141.03, label: 'Fukushima Daiichi', radius: 50 },
  dimona: { lat: 31.0, lon: 35.15, label: 'Dimona (Israel)', radius: 100 },
};

// Only readings from this window count. Safecast coverage near several of these sites is sparse, and a reading
// from years ago must not be presented as the current state.
const WINDOW_DAYS = parseInt(process.env.SAFECAST_WINDOW_DAYS) || 30;

// Briefing — check radiation levels near key nuclear sites
export async function briefing() {
  const sinceDate = new Date(Date.now() - WINDOW_DAYS * 86400000);
  const results = await Promise.all(
    Object.entries(NUCLEAR_SITES).map(async ([key, site]) => {
      const data = await getMeasurements({
        latitude: site.lat,
        longitude: site.lon,
        distance: site.radius,
        limit: 25,
      });

      const all = Array.isArray(data) ? data : [];
      const newest = all.map(m => m.captured_at).filter(Boolean).sort().pop() || null;
      const measurements = all.filter(m => m.captured_at && new Date(m.captured_at) >= sinceDate);
      const values = measurements.map(m => m.value).filter(v => typeof v === 'number');
      const avgCPM = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

      return {
        site: site.label,
        key,
        recentReadings: values.length,
        avgCPM,
        maxCPM: values.length > 0 ? Math.max(...values) : null,
        // Normal background: 10-80 CPM. >100 CPM warrants attention.
        anomaly: avgCPM !== null && avgCPM > 100,
        lastReading: newest,
        windowDays: WINDOW_DAYS,
      };
    })
  );

  const anomalies = results.filter(r => r.anomaly);
  const withData = results.filter(r => r.recentReadings > 0);

  return {
    source: 'Safecast',
    timestamp: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    sites: results,
    signals: anomalies.length > 0
      ? anomalies.map(a => `ELEVATED RADIATION at ${a.site}: ${a.avgCPM?.toFixed(1)} CPM (normal: 10-80, last ${WINDOW_DAYS}d)`)
      : withData.length > 0
        ? [`${withData.length} of ${results.length} monitored nuclear sites have Safecast readings in the last ${WINDOW_DAYS} days — all within normal levels`]
        : [`No Safecast readings near any monitored nuclear site in the last ${WINDOW_DAYS} days`],
  };
}

if (process.argv[1]?.endsWith('safecast.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
