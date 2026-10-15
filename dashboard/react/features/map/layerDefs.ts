// Map layer definitions and filters, ported faithfully from jarvis.html: LAYER_DEFS (992-1010),
// LAYER_INFO (1012-1028), LAYER_SYNONYMS (1029-1045), TIME_WINDOWS (1046), filterLayers (1431-1440)
// and the `inTime`/`pass` closure (2137-2138).
//
// The legacy filter read module-level globals (`layerVisible`, `timeWindow`, `currentRegion`); here
// every input is an explicit argument so the logic is pure and testable.

import { inActiveRegion, type RegionKey } from './regions';

export interface LayerDef {
  key: string;
  label: string;
  color: string;
}

/** The 17 map layers, legacy LAYER_DEFS (992-1010). */
export const LAYER_DEFS: LayerDef[] = [
  { key: 'air', label: 'Air', color: '#7fe0c0' },
  { key: 'thermal', label: 'Thermal', color: '#ff6b74' },
  { key: 'conflict', label: 'Conflict', color: '#f59a5e' },
  { key: 'maritime', label: 'Chokepoints', color: '#b48cff' },
  { key: 'ships', label: 'Ships', color: '#7fc8ff' },
  { key: 'nuke', label: 'Nuclear', color: '#f2c879' },
  { key: 'sdr', label: 'SDR', color: '#6aa8ff' },
  { key: 'health', label: 'Health', color: '#7fe0c0' },
  { key: 'news', label: 'News', color: '#8fb8d8' },
  { key: 'weather', label: 'Weather', color: '#f59a5e' },
  { key: 'radiation', label: 'RadNet', color: '#f2c879' },
  { key: 'space', label: 'Space', color: '#e9ecf2' },
  { key: 'gdelt', label: 'GDELT', color: '#6aa8ff' },
  { key: 'track', label: 'Tracks', color: '#ff9e6b' },
  { key: 'quake', label: 'Quakes', color: '#ffa94d' },
  { key: 'disaster', label: 'Disasters', color: '#ff8a5c' },
  { key: 'outage', label: 'Outages', color: '#c084fc' },
];

/** Per-layer explainability card data, legacy LAYER_INFO (1012-1028). */
export interface LayerInfo {
  purpose: string;
  source: string;
  freshness: string;
  confidence: string;
  limitations: string[];
}

export const LAYER_INFO: Record<string, LayerInfo> = {
  air: { purpose: 'Aircraft counts per theater as an activity signal, plus every military aircraft currently broadcasting ADS-B, plotted at its real position.', source: 'OpenSky Network global snapshot; adsb.lol military feed and theater samples when OpenSky is throttled', freshness: 'Refreshed every sweep (~15 min); theater samples rotate across sweeps', confidence: 'Good for relative volume and for who is flying where; coverage varies with ADS-B reach.', limitations: ['A theater marked "sampled" was read through one 250 nm circle, not the whole box', 'Military aircraft with transponders off are invisible by definition', 'Sparse over oceans, Africa and active conflict zones'] },
  thermal: { purpose: 'Satellite-detected thermal anomalies (fires, flares, explosions, strikes) in six watched regions over the last 24 h; the strongest detections by fire radiative power are plotted.', source: 'NASA FIRMS, Suomi NPP + NOAA-20 VIIRS (375 m) public active-fire feeds', freshness: 'NASA publishes within ~3 h of each satellite pass; refreshed every sweep', confidence: 'Strong for detecting heat sources; weak for telling a strike from agricultural burning. Night detections and high radiative power are the better combat indicators.', limitations: ['Clouds and smoke hide detections', 'Large region boxes always contain routine burning and gas flaring', 'Two satellites can both report one fire'] },
  conflict: { purpose: 'Armed-clash and mass-violence clusters, ringed by how many outlets report them.', source: 'GDELT 2.0 event export (CAMEO codes 18–20)', freshness: 'Refreshed every sweep; covers the last few hours of global media', confidence: 'Good for where fighting is being reported right now; counts are media mentions, not casualties.', limitations: ['Media volume, not verified events', 'Clusters sit on the geocoded place name, not the exact site', 'No fatality figures'] },
  maritime: { purpose: 'Traffic through the world\'s maritime chokepoints: ships per day over the last 7 days against the one-year average, the week-on-week trend, tanker share, and any disruption event PortWatch has open for that passage.', source: 'IMF PortWatch open data (satellite AIS-derived daily transit counts, 28 chokepoints)', freshness: 'PortWatch publishes with roughly a week of lag; refreshed every sweep', confidence: 'Transit counts are robust for trend and disruption detection.', limitations: ['About 7 days behind real time', 'Counts ships, not cargo value', 'No per-vessel tracking without an AIS stream key'] },
  nuke: { purpose: 'Live gamma dose rate from fixed radiation sensors around nuclear plants and legacy sites, with the typical (median) reading per site and every sensor plotted.', source: 'Safecast realtime sensor network (tt.safecast.org)', freshness: 'Sensors report every few minutes; refreshed every sweep', confidence: 'Good anomaly screen where sensors exist. Normal outdoor background is 0.05–0.3 µSv/h (roughly 15–100 CPM on an LND 7318 tube).', limitations: ['No public sensors near Bushehr, Yongbyon or Dimona', 'Chernobyl exclusion zone reads permanently above background by design', 'Single hot sensors are flagged but do not flip a site; the site median does'] },
  ships: { purpose: 'Live ship positions from AIS transponders in the approaches to the major chokepoints, with class (tanker, cargo, passenger, military/law enforcement), speed, course, navigation status and declared destination.', source: 'aisstream.io live AIS feed (terrestrial + satellite receivers), held open by the server', freshness: 'Positions update continuously; the map refreshes about every minute and shows ships heard in the last hour', confidence: 'Exact for ships transmitting AIS. Ships running dark are invisible by definition.', limitations: ['Only the chokepoint boxes are subscribed, not the open ocean', 'Receiver coverage varies; some areas report mainly large ships', 'Class B (small craft) data is sparser'] },
  sdr: { purpose: 'Where the public can listen to HF radio (0–30 MHz) right now: every listed KiwiSDR receiver worldwide, with live status, listener load and signal-to-noise for the receivers inside the watched conflict regions.', source: 'receiverbook.de directory + each receiver\'s own /status endpoint', freshness: 'Directory and watched-region probes refreshed every sweep', confidence: 'Live numbers are exact for probed receivers; the rest of the directory is listing only.', limitations: ['Only watched-region receivers are probed for live state', 'Volunteer-run; receivers come and go', 'Listener load shows interest, not what is being heard'] },
  disaster: { purpose: 'Natural-disaster events at GDACS Orange or Red alert: cyclones, earthquakes, floods, volcanoes, droughts and wildfires, scored by expected humanitarian impact.', source: 'GDACS (UN OCHA / EU Joint Research Centre)', freshness: 'Refreshed every sweep; GDACS updates episodes as forecasts and reports arrive', confidence: 'Authoritative automated alerts; the level is a model of impact, not a damage report.', limitations: ['A closed event stays listed for a few days after its end date', 'Drought alerts cover whole regions and are pinned to one point', 'Green-level events are not shown'] },
  outage: { purpose: 'Countries and networks whose internet connectivity has dropped below their own baseline in the last 24 hours, from BGP reachability, active probing and darknet traffic, with Cloudflare Radar\'s curated outage annotations (cause, start and end) and DDoS target shares.', source: 'IODA (Georgia Tech Internet Intelligence Lab); Cloudflare Radar', freshness: 'Refreshed every sweep; IODA detects within minutes', confidence: 'Strong for national shutdowns and cable cuts; single-network alerts are routine churn.', limitations: ['A national flag needs a BGP or probing signal; Google-traffic-only alerts are shown as traffic dips', 'Small territories trip the detector on quiet days', 'Pins sit on the country centroid'] },
  health: { purpose: 'Active disease outbreaks with WHO\'s own risk assessment, CDC travel health notices (levels 1–4) and US multistate outbreak investigations, pinned to the countries they name.', source: 'WHO Disease Outbreak News API; CDC Travel Health Notices and CDC outbreak RSS feeds', freshness: 'Refreshed every sweep (~15 min); WHO publishes a follow-up notice every 2–4 weeks for an ongoing event', confidence: 'Authoritative for officially declared events. Risk levels are WHO\'s words, parsed from the notice.', limitations: ['WHO notices lag the event by days; many are country-level, so pins sit on the country centroid', 'An outbreak stays listed for 90 days after its last WHO notice', 'CDC levels are travel advice for US travellers, not outbreak severity', 'Only places the dashboard can locate are pinned'] },
  news: { purpose: 'Geolocated world-news headlines.', source: 'Aggregated RSS / GDELT geocoding', freshness: 'Minutes', confidence: 'Broad coverage, variable quality.', limitations: ['Geocoding can be approximate', 'Duplicate framing across outlets'] },
  weather: { purpose: 'Official severe-weather alerts.', source: 'NOAA / NWS', freshness: 'Minutes', confidence: 'Authoritative for the US.', limitations: ['US-centric coverage', 'Alert polygons are approximated as points'] },
  radiation: { purpose: 'EPA RadNet environmental radiation stations.', source: 'EPA RadNet', freshness: 'Refreshed every sweep', confidence: 'Reference-grade background readings.', limitations: ['US stations only', 'Sparse sampling cadence'] },
  space: { purpose: 'Live positions of the ISS, China\'s Tiangong and the vehicles docked to or flying near them, propagated in the browser from their current orbital elements (SGP4), with the next and last half-orbit ground track for the crewed stations.', source: 'CelesTrak element sets (TLE mirror / wheretheiss.at fallback)', freshness: 'Elements refreshed every sweep; positions recomputed every few seconds', confidence: 'Accurate to a few km while the element set is under a day or two old.', limitations: ['Only the "stations" catalogue group, not every satellite', 'Element sets age; after days the position drifts by tens of km'] },
  gdelt: { purpose: 'Geocoded conflict events — protests, coercion, assaults, armed clashes, mass violence — clustered by place and sized by how many outlets report them.', source: 'GDELT 2.0 event export (raw 15-minute files)', freshness: 'Every 15 min upstream · rolling 6-hour window', confidence: 'Good for salience and where attention is right now.', limitations: ['Machine-coded from news text; one story can yield several events', 'Geocoding resolves to the place named in the article, which may be a capital rather than the scene', 'No fatality counts; these are media mentions, not verified casualties'] },
};

/** Filter synonyms per layer, legacy LAYER_SYNONYMS (1029-1045). */
export const LAYER_SYNONYMS: Record<string, string[]> = {
  air: ['flight', 'flights', 'plane', 'aviation', 'opensky', 'aircraft', 'adsb'],
  thermal: ['fire', 'fires', 'wildfire', 'firms', 'heat', 'flare'],
  conflict: ['war', 'battle', 'clash', 'fatality', 'fatalities', 'violence'],
  maritime: ['sea', 'chokepoint', 'chokepoints', 'strait', 'shipping'],
  ships: ['ship', 'ships', 'vessel', 'vessels', 'ais', 'tanker', 'tankers', 'cargo', 'freighter'],
  nuke: ['nuclear', 'radiation', 'radnet', 'safecast', 'reactor'],
  sdr: ['radio', 'kiwisdr', 'receiver', 'antenna', 'signals'],
  health: ['who', 'outbreak', 'disease', 'epidemic', 'health'],
  news: ['rss', 'headline', 'headlines', 'media', 'press'],
  weather: ['storm', 'noaa', 'nws', 'alert', 'flood', 'hurricane'],
  radiation: ['radnet', 'epa', 'radiation', 'nuclear', 'safecast'],
  space: ['satellite', 'satellites', 'iss', 'orbit', 'orbital', 'space'],
  gdelt: ['event', 'events', 'geo', 'news volume'],
  disaster: ['disaster', 'disasters', 'gdacs', 'cyclone', 'typhoon', 'flood', 'volcano', 'drought', 'wildfire', 'earthquake'],
  outage: ['outage', 'outages', 'internet', 'ioda', 'shutdown', 'bgp', 'blackout'],
};

/** Time-window lengths in ms, legacy TIME_WINDOWS (1046); `all` disables the filter. */
export const TIME_WINDOWS = { all: null, '1h': 3600000, '24h': 86400000, '7d': 604800000 } as const;

/** Ordered time windows for the legend controls, legacy literal at 1423. */
export const TIME_WINDOW_LIST = ['all', '1h', '24h', '7d'] as const;

export type TimeWindow = (typeof TIME_WINDOW_LIST)[number];

/** True when `def` matches a layer-filter query (label / key / synonym), legacy filterLayers (1431-1440). */
export function matchesLayerFilter(def: LayerDef, query: string): boolean {
  const q = (query || '').trim().toLowerCase();
  const label = def.label.toLowerCase();
  const syn = LAYER_SYNONYMS[def.key] || [];
  return !q || label.includes(q) || def.key.includes(q) || syn.some((s) => s.includes(q));
}

/** The minimal shape `passesLayer` reads from a plotted point. */
export interface LayerPoint {
  type?: string;
  lat?: number | null;
  lng?: number | null;
  ts?: string | number | null;
  [key: string]: unknown;
}

export interface PassOptions {
  /** Per-layer visibility map, legacy `layerVisible`. */
  visible: Record<string, boolean | undefined>;
  region: RegionKey | string;
  timeWindow: TimeWindow;
  now: number;
}

/** The legacy `pass` predicate (2137-2138): layer visible AND inside the active region AND in time. */
export function passesLayer(point: LayerPoint, { visible, region, timeWindow, now }: PassOptions): boolean {
  const w = TIME_WINDOWS[timeWindow];
  const ts = point.ts;
  const inTime = !w || !ts || (now - new Date(ts).getTime()) <= w;
  return !!visible[point.type ?? ''] && inActiveRegion(point.lat ?? NaN, point.lng ?? NaN, region) && inTime;
}
