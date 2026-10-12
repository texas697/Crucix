// Space/CelesTrak — Satellite Activity Monitoring
// No API key required. Uses CelesTrak for public TLE data and launch info.
// Tracks: Recent launches, ISS position, satellite decay alerts, space debris.

import { safeFetch } from '../utils/fetch.mjs';
import * as satellite from 'satellite.js';

const CELESTRAK_BASE = 'https://celestrak.org';
const CELESTRAK_TIMEOUT_MS = parseInt(process.env.CELESTRAK_TIMEOUT_MS) || 15000;
const EARTH_RADIUS_KM = 6371;
const MU = 398600.4418; // km^3/s^2

// Derive period / apogee / perigee from the OMM mean elements (CelesTrak's gp.php JSON carries no SATCAT
// fields such as APOAPSIS or PERIOD, which is why the ISS altitude used to come out NaN).
function orbitFromElements(sat) {
  const n = parseFloat(sat.MEAN_MOTION); // revs/day
  const e = parseFloat(sat.ECCENTRICITY);
  if (!Number.isFinite(n) || n <= 0) return {};
  const nRad = n * 2 * Math.PI / 86400; // rad/s
  const a = Math.cbrt(MU / (nRad * nRad)); // semi-major axis, km
  const ecc = Number.isFinite(e) ? e : 0;
  return {
    period: +(1440 / n).toFixed(2),
    apogee: Math.round(a * (1 + ecc) - EARTH_RADIUS_KM),
    perigee: Math.round(a * (1 - ecc) - EARTH_RADIUS_KM),
  };
}

// The subset of OMM fields satellite.js needs to rebuild the propagator in the browser.
const OMM_FIELDS = ['OBJECT_NAME', 'OBJECT_ID', 'EPOCH', 'MEAN_MOTION', 'ECCENTRICITY', 'INCLINATION', 'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER', 'MEAN_ANOMALY', 'EPHEMERIS_TYPE', 'CLASSIFICATION_TYPE', 'NORAD_CAT_ID', 'ELEMENT_SET_NO',
  'REV_AT_EPOCH', 'BSTAR', 'MEAN_MOTION_DOT', 'MEAN_MOTION_DDOT'];

// SGP4 position now for a satrec: { lat, lon, altitude (km), velocity (km/h) } or null.
export function positionNow(satrec, when = new Date()) {
  try {
    const pv = satellite.propagate(satrec, when);
    if (!pv?.position || typeof pv.position !== 'object') return null;
    const gmst = satellite.gstime(when);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const v = pv.velocity ? Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z) : null;
    return {
      lat: +satellite.degreesLat(geo.latitude).toFixed(2),
      lon: +satellite.degreesLong(geo.longitude).toFixed(2),
      altitude: Math.round(geo.height),
      velocity: v ? Math.round(v * 3600) : null,
      at: when.toISOString(),
    };
  } catch {
    return null;
  }
}

function satrecFromOmm(omm) {
  try { return satellite.json2satrec(omm); } catch { return null; }
}
function satrecFromTle(line1, line2) {
  try { return satellite.twoline2satrec(line1, line2); } catch { return null; }
}

// Crewed stations get a label on the map; everything else in the "stations" group (visiting vehicles, attached
// modules, debris) is plotted without one.
const PRIMARY_STATIONS = new Set([25544, 48274]); // ISS (ZARYA), CSS (TIANHE)
const ATTACHED = /\b(DEB|MODULE|CAMERA|DUPLEX|POISK|NAUKA|WENTIAN|MENGTIAN|RASSVET|PRICHAL)\b/;

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
  const data = await safeFetch(`${CELESTRAK_BASE}${path}`, { timeout: CELESTRAK_TIMEOUT_MS, retries: 0, maxText: 200 });
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

// Get space station data: every object in CelesTrak's "stations" group with derived orbit numbers, the OMM
// elements (for live propagation in the browser) and an SGP4 position at sweep time.
function stationRecord(sat, omm, satrec) {
  const orbit = orbitFromElements(sat);
  const noradId = parseInt(sat.NORAD_CAT_ID);
  return {
    name: sat.OBJECT_NAME,
    noradId,
    primary: PRIMARY_STATIONS.has(noradId),
    attached: ATTACHED.test(sat.OBJECT_NAME || ''),
    inclination: parseFloat(sat.INCLINATION),
    epoch: sat.EPOCH,
    ...orbit,
    omm,
    position: satrec ? positionNow(satrec) : null,
  };
}

async function getStationData() {
  const data = await getTLEs('stations');
  if (data.error || !Array.isArray(data)) {
    return { error: data.error || 'Failed to fetch station data' };
  }

  const stations = data
    .filter(sat => sat.OBJECT_NAME && sat.NORAD_CAT_ID)
    .map(sat => {
      const omm = Object.fromEntries(OMM_FIELDS.filter(k => sat[k] !== undefined).map(k => [k, sat[k]]));
      return stationRecord(sat, omm, satrecFromOmm(omm));
    });
  // Crewed stations first, then visiting vehicles, then attached modules / debris.
  stations.sort((a, b) => (b.primary - a.primary) || (a.attached - b.attached) || a.name.localeCompare(b.name));

  const iss = stations.find(s => s.noradId === 25544) || null;
  return { totalStations: stations.length, stations: stations.slice(0, 20), iss };
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

// tle.ivanstanojevic.me also serves individual TLEs by NORAD id; used for the crewed stations when CelesTrak fails.
async function fallbackStationTle(noradId) {
  const d = await safeFetch(`${TLE_API}/${noradId}`, { timeout: 9000, retries: 0, headers: { Accept: 'application/json' } });
  if (!d || d.error || !d.line1 || !d.line2) return null;
  const satrec = satrecFromTle(d.line1, d.line2);
  if (!satrec) return null;
  // Rebuild the mean elements from the satrec so the browser can propagate from the same data.
  const sat = {
    OBJECT_NAME: d.name || `NORAD ${noradId}`, NORAD_CAT_ID: noradId,
    MEAN_MOTION: satrec.no * 1440 / (2 * Math.PI), ECCENTRICITY: satrec.ecco, INCLINATION: satrec.inclo * 180 / Math.PI,
    EPOCH: d.date ? new Date(d.date).toISOString().replace('Z', '') : null,
  };
  const rec = stationRecord(sat, null, satrec);
  rec.tle = [d.line1, d.line2];
  rec.epoch = sat.EPOCH;
  return rec;
}

// wheretheiss.at gives a live ISS position (lat/lon/altitude) when no element set is available at all.
async function fallbackISS() {
  const d = await safeFetch('https://api.wheretheiss.at/v1/satellites/25544', { timeout: 9000, retries: 0 });
  if (!d || d.error || typeof d.latitude !== 'number') return null;
  return {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    primary: true,
    attached: false,
    inclination: 51.64,
    period: 92.9,
    apogee: Math.round(d.altitude),
    perigee: Math.round(d.altitude),
    epoch: new Date((d.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    position: {
      lat: +d.latitude.toFixed(2), lon: +d.longitude.toFixed(2), altitude: Math.round(d.altitude),
      velocity: Math.round(d.velocity || 0) || null, at: new Date((d.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    },
    live: 'wheretheiss.at',
  };
}

// wheretheiss.at also publishes the current ISS TLE, a second source of elements when the mirror is throttled (508).
async function fallbackIssTle() {
  const d = await safeFetch('https://api.wheretheiss.at/v1/satellites/25544/tles', { timeout: 9000, retries: 0 });
  if (!d || d.error || !d.line1 || !d.line2) return null;
  const satrec = satrecFromTle(d.line1, d.line2);
  if (!satrec) return null;
  const sat = {
    OBJECT_NAME: d.header || 'ISS (ZARYA)', NORAD_CAT_ID: 25544,
    MEAN_MOTION: satrec.no * 1440 / (2 * Math.PI), ECCENTRICITY: satrec.ecco, INCLINATION: satrec.inclo * 180 / Math.PI,
    EPOCH: d.tle_timestamp ? new Date(d.tle_timestamp * 1000).toISOString().replace('Z', '') : null,
  };
  const rec = stationRecord(sat, null, satrec);
  rec.tle = [d.line1, d.line2];
  rec.epoch = sat.EPOCH;
  return rec;
}

async function fallbackStations() {
  const [iss, css] = await Promise.all([fallbackStationTle(25544), fallbackStationTle(48274)]);
  const list = [iss, css].filter(Boolean);
  if (!list.find(s => s.noradId === 25544)) {
    const viaTle = await fallbackIssTle();
    if (viaTle) list.unshift(viaTle);
    else {
      const live = await fallbackISS();
      if (live) list.unshift(live);
    }
  }
  return list;
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
    const [fbNewObjects, fbStations, fbMilitary, fbStarlink, fbOneweb] = await Promise.all([
      launchesFailed ? fallbackNewObjects() : 0,
      stationsFailed ? fallbackStations() : [],
      militaryFailed ? tleCount('USA') : 0,
      constellationsFailed ? tleCount('STARLINK') : 0,
      constellationsFailed ? tleCount('ONEWEB') : 0,
    ]);

    const totalNewObjects = launchesFailed ? fbNewObjects : (launches.totalObjects || 0);
    const stationList = stationsFailed ? fbStations : (stations.stations || []);
    const iss = stationList.find(s => s.noradId === 25544) || null;
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
      stationsSource: stationsFailed ? (stationList.length ? 'tle mirror / wheretheiss.at' : 'none') : 'CelesTrak',
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
