// IODA — Internet Outage Detection and Analysis (Georgia Tech Internet Intelligence Lab).
// No auth required. IODA watches BGP reachability, active probing (ping-slash24) and darknet telescope traffic and
// raises an alert when a country, region or network drops below its own recent baseline. The public v2 API returns
// the alerts and a per-entity outage score. Country-level alerts are rare and mean a national-scale event (Iran
// shutdowns, Sudan, cable cuts); region and ASN alerts are the everyday texture.

import { safeFetch } from '../utils/fetch.mjs';

const API = 'https://api.ioda.inetintel.cc.gatech.edu/v2/outages';
const WINDOW_HOURS = parseInt(process.env.IODA_WINDOW_HOURS) || 24;
const TIMEOUT_MS = 20000;

// Country centroids for the map (ISO 3166-1 alpha-2). Rough is fine: a dot per country.
export const CENTROID = {
  AF: [33.9, 67.7], AL: [41.2, 20.2], DZ: [28, 1.7], AO: [-11.2, 17.9], AR: [-38.4, -63.6], AM: [40.1, 45], AU: [-25.3, 133.8], AT: [47.5, 14.6], AZ: [40.1, 47.6],
  BH: [26, 50.6], BD: [23.7, 90.4], BY: [53.7, 27.9], BE: [50.5, 4.5], BJ: [9.3, 2.3], BO: [-16.3, -63.6], BA: [43.9, 17.7], BW: [-22.3, 24.7], BR: [-14.2, -51.9], BG: [42.7, 25.5], BF: [12.2, -1.6], BI: [-3.4, 29.9],
  KH: [12.6, 105], CM: [5.7, 12.4], CA: [56.1, -106.3], CF: [6.6, 20.9], TD: [15.5, 18.7], CL: [-35.7, -71.5], CN: [35.9, 104.2], CO: [4.6, -74.3], CD: [-4, 21.8], CG: [-0.2, 15.8], CR: [9.7, -83.8], CI: [7.5, -5.5], HR: [45.1, 15.2], CU: [21.5, -77.8], CY: [35.1, 33.4], CZ: [49.8, 15.5],
  DK: [56.3, 9.5], DJ: [11.8, 42.6], DO: [18.7, -70.2], EC: [-1.8, -78.2], EG: [26.8, 30.8], SV: [13.8, -88.9], ER: [15.2, 39.8], EE: [58.6, 25], ET: [9.1, 40.5], FI: [61.9, 25.7], FR: [46.2, 2.2],
  GA: [-0.8, 11.6], GM: [13.4, -15.3], GE: [42.3, 43.4], DE: [51.2, 10.5], GH: [7.9, -1], GR: [39.1, 21.8], GT: [15.8, -90.2], GN: [9.9, -9.7], GY: [4.9, -58.9], HT: [19, -72.3], HN: [15.2, -86.2], HK: [22.3, 114.2], HU: [47.2, 19.5],
  IS: [64.9, -19], IN: [20.6, 79], ID: [-0.8, 113.9], IR: [32.4, 53.7], IQ: [33.2, 43.7], IE: [53.4, -8.2], IL: [31, 34.9], IT: [41.9, 12.6], JM: [18.1, -77.3], JP: [36.2, 138.3], JO: [30.6, 36.2],
  KZ: [48, 66.9], KE: [-0.02, 37.9], KP: [40.3, 127.5], KR: [35.9, 127.8], KW: [29.3, 47.5], KG: [41.2, 74.8], LA: [19.9, 102.5], LV: [56.9, 24.6], LB: [33.9, 35.9], LR: [6.4, -9.4], LY: [26.3, 17.2], LT: [55.2, 23.9], LU: [49.8, 6.1],
  MG: [-18.8, 46.9], MW: [-13.3, 34.3], MY: [4.2, 101.9], ML: [17.6, -4], MT: [35.9, 14.4], MR: [21, -10.9], MX: [23.6, -102.6], MD: [47.4, 28.4], MN: [46.9, 103.8], ME: [42.7, 19.4], MA: [31.8, -7.1], MZ: [-18.7, 35.5], MM: [19, 96.7],
  NA: [-22.9, 18.5], NP: [28.4, 84.1], NL: [52.1, 5.3], NZ: [-40.9, 174.9], NI: [12.9, -85.2], NE: [17.6, 8.1], NG: [9.1, 8.7], MK: [41.6, 21.7], NO: [60.5, 8.5], OM: [21.5, 55.9],
  PK: [30.4, 69.3], PS: [31.9, 35.2], PA: [8.5, -80.8], PG: [-6.3, 143.9], PY: [-23.4, -58.4], PE: [-9.2, -75], PH: [12.9, 121.8], PL: [51.9, 19.1], PT: [39.4, -8.2], PR: [18.2, -66.6], QA: [25.4, 51.2],
  RO: [45.9, 25], RU: [61.5, 105.3], RW: [-1.9, 29.9], SA: [23.9, 45.1], SN: [14.5, -14.5], RS: [44, 21], SL: [8.5, -11.8], SG: [1.35, 103.8], SK: [48.7, 19.7], SI: [46.2, 15], SO: [5.2, 46.2], ZA: [-30.6, 22.9], SS: [6.9, 31.3], ES: [40.5, -3.7], LK: [7.9, 80.8], SD: [12.9, 30.2], SE: [60.1, 18.6], CH: [46.8, 8.2], SY: [34.8, 39],
  TW: [23.7, 121], TJ: [38.9, 71.3], TZ: [-6.4, 34.9], TH: [15.9, 100.9], TL: [-8.9, 125.7], TG: [8.6, 0.8], TN: [33.9, 9.5], TR: [39, 35.2], TM: [38.97, 59.6], UG: [1.4, 32.3], UA: [48.4, 31.2], AE: [23.4, 53.8], GB: [55.4, -3.4], US: [37.1, -95.7], UY: [-32.5, -55.8], UZ: [41.4, 64.6],
  VE: [6.4, -66.6], VN: [14.1, 108.3], YE: [15.6, 48.5], ZM: [-13.1, 27.8], ZW: [-19, 29.2],
  ST: [0.2, 6.6], NF: [-29, 168], MP: [15.2, 145.7], BB: [13.2, -59.5], GU: [13.4, 144.8], FJ: [-17.7, 178], VU: [-15.4, 166.9], WS: [-13.8, -172.1], TO: [-21.2, -175.2], PF: [-17.7, -149.4], NC: [-20.9, 165.6], MV: [3.2, 73.2], MU: [-20.3, 57.6], SC: [-4.7, 55.5], KM: [-11.6, 43.3], CV: [16, -24], GQ: [1.6, 10.3], GW: [11.8, -15.2], SZ: [-26.5, 31.5], LS: [-29.6, 28.2], BZ: [17.2, -88.5], SR: [3.9, -56], TT: [10.7, -61.2], BS: [25, -77.4], AW: [12.5, -70], CW: [12.2, -69], GL: [71.7, -42.6], FO: [62, -7], BT: [27.5, 90.4], BN: [4.5, 114.7], MO: [22.2, 113.5], XK: [42.6, 20.9], AD: [42.5, 1.5], MC: [43.7, 7.4], LI: [47.1, 9.5], SM: [43.9, 12.4],
};

// Datasources that measure the network itself. 'gtr' (Google traffic) also raises country alerts for tiny
// territories on ordinary quiet days, so it only counts as a national disruption when a network signal agrees.
const NETWORK_SOURCES = new Set(['bgp', 'ping-slash24', 'ucsd-nt', 'merit-nt']);
// A national flag also needs a real drop: IODA raises 1–2 % country alerts routinely.
const NATIONAL_MIN_DROP = parseInt(process.env.IODA_NATIONAL_MIN_DROP) || 10;
const dropPct = a => (a.historyValue > 0 && a.value != null) ? Math.round((1 - a.value / a.historyValue) * 100) : null;

function normalizeAlert(a) {
  const e = a.entity || {};
  // geoasn entities read "AS12345 -- Region"; region/country entities carry the code
  // country: code is ISO2; region: attrs.country_code; geoasn: code ends in "-US" for country-level, numeric otherwise
  const cc = e.type === 'country' ? e.code : e.type === 'region' ? (e.attrs?.country_code || null) : (String(e.code || '').match(/-([A-Z]{2})$/) || [])[1] || null;
  const countryName = e.type === 'country' ? e.name : e.type === 'region' ? (e.attrs?.country_name || null) : (e.type === 'geoasn' && /-[A-Z]{2}$/.test(e.code || '') ? String(e.name).split(' -- ')[1] || null : null);
  return {
    type: e.type, name: e.name, code: e.code, cc, countryName, level: a.level, datasource: a.datasource,
    value: a.value, baseline: a.historyValue, drop: dropPct(a), time: new Date(a.time * 1000).toISOString(),
    org: e.attrs?.org || null, ips: e.attrs?.ip_count ? parseInt(e.attrs.ip_count) : null,
  };
}

export async function briefing() {
  const started = Date.now();
  const until = Math.floor(Date.now() / 1000), from = until - WINDOW_HOURS * 3600;
  const [summary, alerts] = await Promise.all([
    safeFetch(`${API}/summary?from=${from}&until=${until}&entityType=country&limit=200`, { timeout: TIMEOUT_MS, retries: 1 }),
    safeFetch(`${API}/alerts?from=${from}&until=${until}&limit=2000`, { timeout: TIMEOUT_MS, retries: 1 }),
  ]);
  if (!Array.isArray(alerts?.data) && !Array.isArray(summary?.data)) {
    return { source: 'IODA', timestamp: new Date().toISOString(), windowHours: WINDOW_HOURS, error: alerts?.error || summary?.error || 'IODA returned no data', countries: [], alerts: [], signals: ['IODA unavailable'] };
  }
  const all = (alerts?.data || []).map(normalizeAlert);
  const critical = all.filter(a => a.level === 'critical');

  // One row per country: the outage score from the summary plus the alerts that rolled up to it.
  const byCountry = new Map();
  for (const s of summary?.data || []) {
    const cc = s.entity?.code; if (!cc) continue;
    byCountry.set(cc, { cc, name: s.entity.name, score: Math.round(s.scores?.overall || 0), events: s.event_cnt || 0, sources: Object.keys(s.scores || {}).filter(k => k.endsWith('.median')).map(k => k.replace('.median', '')), countryAlerts: [], regionAlerts: 0, asnAlerts: 0, worstDrop: null });
  }
  for (const a of critical) {
    if (!a.cc) continue;
    let row = byCountry.get(a.cc);
    if (!row) { row = { cc: a.cc, name: a.countryName || a.cc, score: 0, events: 0, sources: [], countryAlerts: [], regionAlerts: 0, asnAlerts: 0, worstDrop: null }; byCountry.set(a.cc, row); }
    if (a.countryName && (row.name === row.cc || a.type === 'country')) row.name = a.countryName;
    if (a.type === 'country') row.countryAlerts.push({ datasource: a.datasource, drop: a.drop, time: a.time });
    else if (a.type === 'region') row.regionAlerts += 1;
    else row.asnAlerts += 1;
    // The headline drop comes from country or region signals; a single network going to zero is routine churn.
    if (a.type !== 'asn' && a.type !== 'geoasn' && a.drop != null && NETWORK_SOURCES.has(a.datasource) && (row.worstDrop == null || a.drop > row.worstDrop)) row.worstDrop = a.drop;
  }
  const countries = [...byCountry.values()].map(c => ({ ...c, lat: CENTROID[c.cc]?.[0] ?? null, lon: CENTROID[c.cc]?.[1] ?? null,
    national: c.countryAlerts.some(a => NETWORK_SOURCES.has(a.datasource) && (a.drop ?? 0) >= NATIONAL_MIN_DROP), minor: c.countryAlerts.length > 0 && !c.countryAlerts.some(a => NETWORK_SOURCES.has(a.datasource) && (a.drop ?? 0) >= NATIONAL_MIN_DROP) }))
    .sort((a, b) => (b.national - a.national) || b.score - a.score);

  // Notable sub-national and network alerts for the detail list: biggest drops first.
  const notable = critical.filter(a => a.type !== 'country' && a.drop != null && a.drop >= 25)
    .sort((a, b) => b.drop - a.drop).slice(0, 25);

  const signals = [];
  for (const c of countries.filter(c => c.national).slice(0, 6)) {
    const ds = [...new Set(c.countryAlerts.map(a => a.datasource))].join('/');
    signals.push(`INTERNET DISRUPTION ${c.name}: national-level ${ds} alert${c.worstDrop != null ? `, ${c.worstDrop}% below baseline` : ''}${c.regionAlerts ? `, ${c.regionAlerts} region alerts` : ''}`);
  }
  for (const a of notable.filter(a => a.type === 'region' && a.drop >= 50).slice(0, 4)) signals.push(`Regional outage: ${a.name} ${a.drop}% below baseline (${a.datasource})`);
  signals.push(`IODA: ${critical.length} critical alerts in ${WINDOW_HOURS}h across ${countries.length} countries (${countries.filter(c => c.national).length} national, ${critical.filter(a => a.type === 'region').length} regional, ${critical.filter(a => a.type === 'asn' || a.type === 'geoasn').length} network)`);

  return {
    source: 'IODA', timestamp: new Date().toISOString(), windowHours: WINDOW_HOURS,
    countries, alerts: notable,
    counts: { critical: critical.length, national: countries.filter(c => c.national).length, regional: critical.filter(a => a.type === 'region').length, network: critical.filter(a => a.type === 'asn' || a.type === 'geoasn').length, countries: countries.length },
    signals, durationMs: Date.now() - started,
  };
}

if (process.argv[1]?.endsWith('ioda.mjs')) {
  console.log(JSON.stringify(await briefing(), null, 2));
}
