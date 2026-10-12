// Cloudflare Radar — Internet traffic anomalies and outages
// Requires a free Cloudflare API token (CLOUDFLARE_API_TOKEN).
// Get one at: https://dash.cloudflare.com/profile/api-tokens
// Create a custom token with Account → Account Analytics → Read permission.
//
// Monitors internet outages, traffic anomalies, and attack trends
// that correlate with conflict, censorship, and infrastructure disruption.

import { safeFetch } from '../utils/fetch.mjs';
import '../utils/env.mjs';

const RADAR_BASE = 'https://api.cloudflare.com/client/v4/radar';
const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
export const countryName = cc => { try { return cc && cc.length === 2 ? REGION_NAMES.of(cc.toUpperCase()) : cc; } catch { return cc; } };

// Countries of intelligence interest for internet monitoring
const WATCHLIST_COUNTRIES = [
  'RU', 'UA', 'CN', 'IR', 'KP', 'SY', 'MM', 'ET', 'SD',
  'YE', 'AF', 'IQ', 'LB', 'PS', 'TW', 'BY', 'VE', 'CU'
];

function getAuthHeaders() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

async function fetchAnnotations() {
  const headers = getAuthHeaders();
  if (!headers) return { error: 'no_credentials' };

  // Cloudflare Radar Annotations — internet outages and government shutdowns
  const url = `${RADAR_BASE}/annotations/outages?dateRange=30d&limit=50&format=json`;
  const data = await safeFetch(url, { timeout: 15000, headers });

  if (data.error) return { error: data.error };

  const annotations = data.result?.annotations || [];
  return annotations.map(a => ({
    id: a.id,
    description: (a.description || '').substring(0, 500),
    startDate: a.startDate,
    endDate: a.endDate,
    linkedUrl: a.linkedUrl || null,
    scope: a.scope || null,
    asns: a.asns || [],
    locations: a.locations || [],
    locationNames: (a.locationsDetails || []).map(l => l.name).filter(Boolean),
    asnNames: (a.asnsDetails || []).map(x => x.name).filter(Boolean).slice(0, 5),
    eventType: a.eventType || 'outage',
    cause: a.outage?.outageCause || null,
    outageType: a.outage?.outageType || null,
    tags: a.tags || [],
  }));
}

async function fetchAttackSummary() {
  const headers = getAuthHeaders();
  if (!headers) return { error: 'no_credentials' };

  // DDoS over the last day: which countries are being hit (L3 and L7) and where L3 traffic originates, as shares
  // of all attack traffic Cloudflare mitigated, plus the L3 vector mix.
  const top = (r, key) => (r?.result?.top_0 || []).map(x => ({ cc: x[`${key}CountryAlpha2`], name: x[`${key}CountryName`], pct: Math.round(parseFloat(x.value) * 10) / 10 })).filter(x => x.cc);
  const [l3t, l3o, l7t, vec] = await Promise.all([
    safeFetch(`${RADAR_BASE}/attacks/layer3/top/locations/target?dateRange=1d&limit=8&format=json`, { timeout: 15000, headers }),
    safeFetch(`${RADAR_BASE}/attacks/layer3/top/locations/origin?dateRange=1d&limit=8&format=json`, { timeout: 15000, headers }),
    safeFetch(`${RADAR_BASE}/attacks/layer7/top/locations/target?dateRange=1d&limit=8&format=json`, { timeout: 15000, headers }),
    safeFetch(`${RADAR_BASE}/attacks/layer3/summary/vector?dateRange=7d&format=json`, { timeout: 15000, headers }),
  ]);
  const result = { l3Targets: top(l3t, 'target'), l3Origins: top(l3o, 'origin'), l7Targets: top(l7t, 'target'), byVector: vec?.result?.summary_0 || null };
  if (!result.l3Targets.length && !result.l7Targets.length) return { error: l3t.error || l7t.error || 'No attack data returned' };
  return result;
}

async function fetchTrafficAnomalies() {
  const headers = getAuthHeaders();
  if (!headers) return { error: 'no_credentials' };

  // Traffic anomalies — significant deviations from normal patterns
  const url = `${RADAR_BASE}/traffic_anomalies?dateRange=7d&format=json&limit=50`;
  const data = await safeFetch(url, { timeout: 15000, headers });

  if (data.error) return { error: data.error };

  const anomalies = data.result?.trafficAnomalies || [];
  return anomalies.map(a => ({
    startDate: a.startDate,
    endDate: a.endDate,
    type: a.type || 'unknown',
    status: a.status,
    verified: a.status === 'VERIFIED',
    cc: a.locationDetails?.code || null,
    country: a.locationDetails?.name || countryName(a.locationDetails?.code) || null,
    asn: a.asnDetails ? { asn: a.asnDetails.asn, name: a.asnDetails.name, cc: a.asnDetails.locations?.code || null } : null,
    visibleInAllDataSources: a.visibleInAllDataSources || false,
  }));
}

function buildSignals(outages, anomalies) {
  const signals = [];

  if (!Array.isArray(outages)) return signals;

  // Check for outages in watchlist countries
  const watchlistOutages = outages.filter(o => {
    const locations = o.locations || [];
    return locations.some(l => WATCHLIST_COUNTRIES.includes(l));
  });

  if (watchlistOutages.length > 0) {
    const countries = [...new Set(watchlistOutages.flatMap(o => o.locations))].filter(l => WATCHLIST_COUNTRIES.includes(l));
    signals.push({
      severity: 'high',
      signal: `Internet outages detected in ${countries.join(', ')} — possible government shutdown or infrastructure attack`,
    });
  }

  // Multiple outages in same country = sustained disruption
  const locationCounts = {};
  for (const o of outages) {
    for (const loc of (o.locations || [])) {
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
  }

  const repeated = Object.entries(locationCounts)
    .filter(([, count]) => count >= 3)
    .map(([loc]) => loc);

  if (repeated.length > 0) {
    signals.push({
      severity: 'medium',
      signal: `Sustained internet disruptions in ${repeated.join(', ')} — ${repeated.length} locations with 3+ outage events in 30 days`,
    });
  }

  // Traffic anomalies
  if (Array.isArray(anomalies) && anomalies.length > 10) {
    signals.push({
      severity: 'medium',
      signal: `${anomalies.length} traffic anomalies detected globally in last 7 days — elevated internet instability`,
    });
  }

  return signals;
}

export async function briefing() {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    return {
      source: 'Cloudflare-Radar',
      timestamp: new Date().toISOString(),
      status: 'no_credentials',
      message: 'Set CLOUDFLARE_API_TOKEN in .env. Get a free token at https://dash.cloudflare.com/profile/api-tokens with Account → Account Analytics → Read permission.',
    };
  }

  const [outages, attacks, anomalies] = await Promise.all([
    fetchAnnotations(),
    fetchAttackSummary(),
    fetchTrafficAnomalies(),
  ]);

  // Handle complete failure
  if (outages?.error && attacks?.error && anomalies?.error) {
    return {
      source: 'Cloudflare-Radar',
      timestamp: new Date().toISOString(),
      error: outages.error || attacks.error || anomalies.error,
    };
  }

  const outageList = Array.isArray(outages) ? outages : [];
  const anomalyList = Array.isArray(anomalies) ? anomalies : [];

  // Separate active vs resolved outages
  const now = new Date();
  const activeOutages = outageList.filter(o => !o.endDate || new Date(o.endDate) > now);
  const recentResolved = outageList.filter(o => o.endDate && new Date(o.endDate) <= now).slice(0, 10);

  // Group outages by location
  const outagesByLocation = {};
  for (const o of outageList) {
    for (const loc of (o.locations || ['unknown'])) {
      if (!outagesByLocation[loc]) outagesByLocation[loc] = [];
      outagesByLocation[loc].push(o);
    }
  }

  const topAffectedLocations = Object.entries(outagesByLocation)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .map(([location, events]) => ({
      location,
      eventCount: events.length,
      activeCount: events.filter(e => !e.endDate || new Date(e.endDate) > now).length,
    }));

  const signals = buildSignals(outageList, anomalyList);

  return {
    source: 'Cloudflare-Radar',
    timestamp: new Date().toISOString(),
    outages: {
      total: outageList.length,
      active: activeOutages.length,
      activeEvents: activeOutages.slice(0, 20),
      recentResolved: recentResolved,
      topAffectedLocations,
    },
    anomalies: {
      total: anomalyList.length,
      events: anomalyList.slice(0, 20),
    },
    attacks: attacks?.error ? { error: attacks.error } : attacks,
    signals,
  };
}

// Run standalone
if (process.argv[1]?.endsWith('cloudflare-radar.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
