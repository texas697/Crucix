export const TRACKS_PATH = '/api/tracks';
export const ALERTS_PATH = '/api/alerts';
export const QUAKES_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
export const POLYMARKET_URL =
  'https://gamma-api.polymarket.com/events?limit=50&active=true&closed=false&order=volume24hr&ascending=false';
export const MARKET_KEYWORDS =
  /(iran|israel|russia|ukrain|war|ceasefire|strike|nuclear|nato|china|taiwan|gaza|hezbollah|houthi|\boil\b|gold|recession|invasion|missile)/i;
export const ALERT_WINDOW_MS = 3_600_000;
export const MARKET_LIMIT = 6;
export const DEFAULT_INTERVALS = { tracks: 15000, alerts: 45000, quakes: 60000, markets: 60000 } as const;
