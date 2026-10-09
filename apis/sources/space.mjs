// Space/CelesTrak — Satellite Activity Monitoring
// No API key required. Uses CelesTrak for public TLE data and launch info.
// Tracks: Recent launches, ISS position, satellite decay alerts, space debris.

import { safeFetch } from '../utils/fetch.mjs';

const CELESTRAK_BASE = 'https://celestrak.org';

// Satellite categories for monitoring
const SAT_CATEGORIES = {
  stations: '/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
  lastDay: '/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=json',
  military: '/NORAD/elements/gp.php?GROUP=military&FORMAT=json',
  gps: '/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=json',
  starlink: '/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json',
  oneweb: '/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=json',
};

// Get TLE data for a category (fast-fail: CelesTrak is often unreachable / IP-blocked)
async function getTLEs(category) {
  const path = SAT_CATEGORIES[category];
  if (!path) return { error: 'Invalid category' };
  const data = await safeFetch(`${CELESTRAK_BASE}${path}`, { timeout: 9000, retries: 0 });
  return data;
}

// Get recent launches (from last 30 days TLEs)
async function getRecentLaunches() {
  const data = await getTLEs('lastDay');
  if (data.error || !Array.isArray(data)) {
    return { error: data.error || 'Failed to fetch launch data' };
  }

  const launches = data.map(sat => ({
    name: sat.OBJECT_NAME,
    noradId: sat.NORAD_CAT_ID,
    classification: sat.CLASSIFICATION_TYPE,
    launchDate: sat.LAUNCH_DATE,
    decayDate: sat.DECAY_DATE,
    period: sat.PERIOD,
    inclination: sat.INCLINATION,
    apogee: sat.APOAPSIS,
    perigee: sat.PERIAPSIS,
    epoch: sat.EPOCH,
    country: sat.COUNTRY_CODE,
    objectType: sat.OBJECT_TYPE,
  })).filter(s => s.name && s.noradId);

  launches.sort((a, b) => new Date(b.epoch || 0) - new Date(a.epoch || 0));

  const byCountry = {};
  launches.forEach(l => {
    const country = l.country || 'UNK';
    byCountry[country] = (byCountry[country] || 0) + 1;
  });

  return { totalObjects: launches.length, recentLaunches: launches.slice(0, 25), byCountry };
}

// Get space station data
async function getStationData() {
  const data = await getTLEs('stations');
  if (data.error || !Array.isArray(data)) {
    return { error: data.error || 'Failed to fetch station data' };
  }

  const stations = data.map(sat => ({
    name: sat.OBJECT_NAME,
    noradId: sat.NORAD_CAT_ID,
    apogee: sat.APOAPSIS,
    perigee: sat.PERIAPSIS,
    inclination: sat.INCLINATION,
    period: sat.PERIOD,
    epoch: sat.EPOCH,
  })).filter(s => s.name);

  const iss = stations.find(s => s.name.includes('ISS') || s.noradId === 25544);

  return { totalStations: stations.length, stations: stations.slice(0, 10), iss };
}

// Get military satellite count
async function getMilitaryCount() {
  const data = await getTLEs('military');
  if (data.error || !Array.isArray(data)) {
    return { count: 0, error: data.error };
  }

  const byCountry = {};
  data.forEach(sat => {
    const country = sat.COUNTRY_CODE || 'UNK';
    byCountry[country] = (byCountry[country] || 0) + 1;
  });

  return { count: data.length, byCountry };
}

// Get mega-constellation stats (Starlink, OneWeb)
async function getConstellationStats() {
  const [starlink, oneweb] = await Promise.all([
    getTLEs('starlink'),
    getTLEs('oneweb'),
  ]);

  return {
    starlink: Array.isArray(starlink) ? starlink.length : 0,
    oneweb: Array.isArray(oneweb) ? oneweb.length : 0,
  };
}

// Generate signals
function generateSignals(data) {
  const signals = [];

  if (data.launches?.totalObjects > 50) {
    signals.push(`HIGH LAUNCH TEMPO: ${data.launches.totalObjects} new objects tracked in last 30 days`);
  }

  const byCountry = data.launches?.byCountry || {};
  const cnLaunches = byCountry['PRC'] || byCountry['CN'] || 0;
  const ruLaunches = byCountry['CIS'] || byCountry['RU'] || 0;

  if (cnLaunches > 10) {
    signals.push(`CHINA SPACE ACTIVITY: ${cnLaunches} objects launched recently`);
  }
  if (ruLaunches > 5) {
    signals.push(`RUSSIA SPACE ACTIVITY: ${ruLaunches} objects launched recently`);
  }
  if (data.military?.count > 500) {
    signals.push(`MILITARY CONSTELLATION: ${data.military.count} tracked military satellites`);
  }
  if (data.constellations?.starlink > 6000) {
    signals.push(`STARLINK MEGA-CONSTELLATION: ${data.constellations.starlink} active satellites`);
  }

  return signals;
}

// === Fallback sources (used when CelesTrak is unreachable) ===
// tle.ivanstanojevic.me mirrors CelesTrak TLEs and exposes totalItems for a name search.
const TLE_API = 'https://tle.ivanstanojevic.me/api/tle';
async function tleCount(search) {
  const data = await safeFetch(`${TLE_API}?search=${encodeURIComponent(search)}`, {
    timeout: 9000, retries: 0, headers: { Accept: 'application/json' },
  });
  return data && !data.error && Number.isFinite(data.totalItems) ? data.totalItems : 0;
}

// wheretheiss.at gives a live ISS position (lat/lon/altitude).
async function fallbackISS() {
  const d = await safeFetch('https://api.wheretheiss.at/v1/satellites/25544', { timeout: 9000, retries: 0 });
  if (!d || d.error || typeof d.latitude !== 'number') return null;
  return {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    lat: +d.latitude.toFixed(2),
    lon: +d.longitude.toFixed(2),
    altitude: Math.round(d.altitude),
    apogee: Math.round(d.altitude),
    perigee: Math.round(d.altitude),
    inclination: 51.64,
    period: 92.9,
    epoch: new Date((d.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}

// SatNOGS catalog carries launch dates — count objects launched in the last 30 days.
async function fallbackNewObjects() {
  const arr = await safeFetch('https://db.satnogs.org/api/satellites/?format=json', { timeout: 12000, retries: 0 });
  if (!Array.isArray(arr)) return 0;
  const now = Date.now(), win = 30 * 86400000;
  return arr.filter(s => {
    if (!s.launched) return false;
    const t = new Date(s.launched).getTime();
    return Number.isFinite(t) && (now - t) <= win && (now - t) >= 0;
  }).length;
}

// Briefing export
export async function briefing() {
  try {
    const [launches, stations, military, constellations] = await Promise.all([
      getRecentLaunches(),
      getStationData(),
      getMilitaryCount(),
      getConstellationStats(),
    ]);

    const launchesFailed = !!launches.error;
    const stationsFailed = !!stations.error;
    const militaryFailed = !!military.error || !military.count;
    const constellationsFailed = !constellations.starlink && !constellations.oneweb;

    // Fallbacks (CelesTrak is frequently unreachable / IP-blocked; these hosts are open)
    const [fbNewObjects, fbIss, fbMilitary, fbStarlink, fbOneweb] = await Promise.all([
      launchesFailed ? fallbackNewObjects() : 0,
      stationsFailed ? fallbackISS() : null,
      militaryFailed ? tleCount('USA') : 0,
      constellationsFailed ? tleCount('STARLINK') : 0,
      constellationsFailed ? tleCount('ONEWEB') : 0,
    ]);

    const totalNewObjects = launchesFailed ? fbNewObjects : (launches.totalObjects || 0);
    const iss = stationsFailed ? fbIss : (stations.iss || null);
    const stationList = stationsFailed ? (fbIss ? [fbIss] : []) : (stations.stations || []);
    const militaryCount = militaryFailed ? fbMilitary : (military.count || 0);
    const cons = constellationsFailed ? { starlink: fbStarlink, oneweb: fbOneweb } : constellations;

    const hasData = !launchesFailed || !stationsFailed || Boolean(iss) || totalNewObjects > 0 || cons.starlink > 0;

    if (!hasData) {
      return {
        source: 'Space (CelesTrak + fallback)',
        timestamp: new Date().toISOString(),
        status: 'error',
        error: launches.error || stations.error || 'Failed to fetch space data',
      };
    }

    const signals = generateSignals({
      launches: { totalObjects: totalNewObjects, byCountry: launches.byCountry || {} },
      military: { count: militaryCount },
      constellations: cons,
    });

    return {
      source: 'Space (CelesTrak + fallback)',
      timestamp: new Date().toISOString(),
      status: 'active',
      recentLaunches: launches.recentLaunches || [],
      totalNewObjects,
      launchByCountry: launches.byCountry || {},
      spaceStations: stationList,
      iss,
      militarySatellites: militaryCount,
      militaryByCountry: military.byCountry || {},
      constellations: cons,
      signals,
    };
  } catch (e) {
    return {
      source: 'Space (CelesTrak + fallback)',
      timestamp: new Date().toISOString(),
      status: 'error',
      error: e.message,
    };
  }
}

if (process.argv[1]?.endsWith('space.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
