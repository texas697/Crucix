// OpenSky Network — Real-time flight tracking
// Free for research. 4,000 API credits/day (no auth), 8,000 with account.
// Tracks all aircraft with ADS-B transponders including many military.

import { safeFetch } from '../utils/fetch.mjs';

const BASE = 'https://opensky-network.org/api';

// Get all current flights (global state vector)
export async function getAllFlights() {
  return safeFetch(`${BASE}/states/all`, { timeout: 30000 });
}

// Get flights in a bounding box (lat/lon)
export async function getFlightsInArea(lamin, lomin, lamax, lomax) {
  const params = new URLSearchParams({
    lamin: String(lamin),
    lomin: String(lomin),
    lamax: String(lamax),
    lomax: String(lomax),
  });
  // OpenSky rate-limits aggressively (4k credits/day unauthenticated).
  // Exponential backoff with retries handles 429 gracefully so partial
  // hotspot data is returned instead of blank fallback.
  return safeFetch(`${BASE}/states/all?${params}`, { timeout: 20000, retries: 2 });
}

// Get flights by specific aircraft (ICAO24 hex codes)
export async function getFlightsByIcao(icao24List) {
  const icao = Array.isArray(icao24List) ? icao24List : [icao24List];
  const params = icao.map(i => `icao24=${i}`).join('&');
  return safeFetch(`${BASE}/states/all?${params}`, { timeout: 20000 });
}

// Get departures from an airport in a time range
export async function getDepartures(airportIcao, begin, end) {
  const params = new URLSearchParams({
    airport: airportIcao,
    begin: String(Math.floor(begin / 1000)),
    end: String(Math.floor(end / 1000)),
  });
  return safeFetch(`${BASE}/flights/departure?${params}`);
}

// Get arrivals at an airport
export async function getArrivals(airportIcao, begin, end) {
  const params = new URLSearchParams({
    airport: airportIcao,
    begin: String(Math.floor(begin / 1000)),
    end: String(Math.floor(end / 1000)),
  });
  return safeFetch(`${BASE}/flights/arrival?${params}`);
}

// Key hotspot regions for monitoring
const HOTSPOTS = {
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

// adsb.lol fallback — free, no key, far less rate-limited than OpenSky.
// Approximate circular coverage centred on the hotspot box.
async function fetchAdsbLol(box) {
  const lat = (box.lamin + box.lamax) / 2;
  const lon = (box.lomin + box.lomax) / 2;
  const dLat = ((box.lamax - box.lamin) / 2) * 60;
  const dLon = ((box.lomax - box.lomin) / 2) * 60 * Math.cos((lat * Math.PI) / 180);
  const dist = Math.max(50, Math.min(250, Math.round(Math.hypot(dLat, dLon))));
  const url = `https://api.adsb.lol/v2/lat/${lat.toFixed(2)}/lon/${lon.toFixed(2)}/dist/${dist}`;
  const data = await safeFetch(url, { timeout: 20000, retries: 1 });
  return Array.isArray(data?.ac) ? data.ac : [];
}

// Briefing — check hotspot regions for flight activity.
// Primary source is OpenSky; when it is rate-limited (frequent 429s) or returns
// nothing, fall back to adsb.lol so the flight layer is not left blank.
export async function briefing() {
  const hotspotEntries = Object.entries(HOTSPOTS);
  const results = await Promise.all(
    hotspotEntries.map(async ([key, box]) => {
      const data = await getFlightsInArea(box.lamin, box.lomin, box.lamax, box.lomax);
      const error = data?.error || null;
      let states = data?.states || [];
      let via = 'OpenSky';

      if (error || states.length === 0) {
        try {
          const ac = await fetchAdsbLol(box);
          if (ac.length) {
            // Normalise to the OpenSky state-vector shape the aggregation expects.
            states = ac.map(a => [
              a.hex,
              a.flight,
              null,
              null,
              null,
              null,
              null,
              typeof a.alt_baro === 'number' ? a.alt_baro * 0.3048 : (a.alt_baro === 'ground' ? 0 : null),
            ]);
            via = 'adsb.lol';
          }
        } catch { /* keep empty */ }
      }

      const byCountry = {};
      if (via === 'OpenSky') {
        for (const s of states) {
          const country = s[2] || 'Unknown';
          byCountry[country] = (byCountry[country] || 0) + 1;
        }
      }
      return {
        region: box.label,
        key,
        totalAircraft: states.length,
        byCountry,
        noCallsign: states.filter(s => !s[1]?.trim()).length,
        highAltitude: states.filter(s => s[7] && s[7] > 12000).length,
        via,
        ...(via === 'adsb.lol' && error ? { note: `OpenSky: ${error}` } : {}),
        ...(via === 'OpenSky' && error ? { error } : {}),
      };
    })
  );

  const fallbackCount = results.filter(r => r.via !== 'OpenSky').length;
  const source = fallbackCount === 0
    ? 'OpenSky'
    : fallbackCount === results.length
      ? 'adsb.lol (OpenSky fallback)'
      : `OpenSky + adsb.lol (${fallbackCount}/${results.length})`;

  return {
    source,
    timestamp: new Date().toISOString(),
    hotspots: results,
    ...(fallbackCount ? { note: `${fallbackCount}/${results.length} hotspots via adsb.lol fallback` } : {}),
  };
}

if (process.argv[1]?.endsWith('opensky.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
