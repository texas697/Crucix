// Live AIS vessel positions from aisstream.io (free; needs AISSTREAM_API_KEY).
//
// aisstream only speaks WebSocket, so this module keeps one persistent subscription open for the whole process
// (Cloud Run runs a single always-on instance), covering a bounding box around each major chokepoint. Every
// position report updates an in-memory vessel table; static-data messages add name, type and destination.
// The maritime source and the /api/ais route read snapshots from that table — there is no polling of aisstream.

const STREAM_URL = 'wss://stream.aisstream.io/v0/stream';
const STALE_MS = parseInt(process.env.AIS_STALE_MS) || 2 * 3600 * 1000;   // drop vessels silent for 2 h
const LIVE_WINDOW_MS = 60 * 60 * 1000;                                       // "now" = heard in the last hour
const MAX_VESSELS = 40000;

// Watched boxes: [[latMin, lonMin], [latMax, lonMax]]. Keyed by the PortWatch chokepoint id so the maritime
// source can join live counts onto the transit statistics.
export const AIS_BOXES = {
  chokepoint6: { label: 'Strait of Hormuz', box: [[23.5, 54.0], [27.5, 58.5]] },
  chokepoint4: { label: 'Bab el-Mandeb', box: [[11.0, 41.5], [15.0, 45.0]] },
  chokepoint1: { label: 'Suez Canal', box: [[29.0, 31.5], [32.5, 33.5]] },
  chokepoint5: { label: 'Malacca Strait', box: [[0.5, 100.0], [5.5, 105.0]] },
  chokepoint11: { label: 'Taiwan Strait', box: [[22.5, 117.0], [26.0, 121.5]] },
  chokepoint3: { label: 'Bosporus', box: [[40.0, 27.5], [42.0, 30.0]] },
  chokepoint2: { label: 'Panama Canal', box: [[8.0, -80.5], [10.0, -78.5]] },
  chokepoint8: { label: 'Gibraltar Strait', box: [[35.0, -7.0], [37.0, -4.5]] },
  chokepoint9: { label: 'Dover Strait', box: [[50.0, 0.0], [52.0, 3.0]] },
  chokepoint7: { label: 'Cape of Good Hope', box: [[-36.0, 17.0], [-33.5, 21.0]] },
  chokepoint28: { label: 'Kerch Strait', box: [[44.5, 35.5], [46.0, 37.5]] },
  chokepoint12: { label: 'Korea Strait', box: [[33.0, 127.5], [35.5, 130.5]] },
  chokepoint14: { label: 'Luzon Strait', box: [[19.0, 120.0], [22.0, 122.5]] },
};

// AIS ship type codes → coarse class
export function shipClass(type) {
  const t = parseInt(type);
  if (!Number.isFinite(t) || t <= 0) return 'unknown';
  if (t >= 80 && t <= 89) return 'tanker';
  if (t >= 70 && t <= 79) return 'cargo';
  if (t >= 60 && t <= 69) return 'passenger';
  if (t === 35) return 'military';
  if (t === 55) return 'law';
  if (t === 30) return 'fishing';
  if (t === 31 || t === 32 || t === 52) return 'tug';
  if (t === 36 || t === 37) return 'pleasure';
  if (t >= 40 && t <= 49) return 'highspeed';
  if (t === 50 || t === 51 || t === 53 || t === 54 || t === 58) return 'service';
  return 'other';
}
const NAV = { 0: 'under way', 1: 'at anchor', 2: 'not under command', 3: 'restricted manoeuvrability', 4: 'constrained by draught', 5: 'moored', 6: 'aground', 7: 'fishing', 8: 'sailing', 11: 'towing astern', 12: 'towing ahead', 14: 'AIS-SART', 15: 'undefined' };
export const navStatus = n => NAV[n] || 'undefined';

const state = {
  key: null, ws: null, connected: false, since: null, lastMessageAt: null, messages: 0, positions: 0, reconnects: 0,
  backoff: 1000, stopped: false, lastError: null,
};
const vessels = new Map(); // mmsi → record

function boxFor(lat, lon) {
  for (const [id, b] of Object.entries(AIS_BOXES)) {
    const [[s, w], [n, e]] = b.box;
    if (lat >= s && lat <= n && lon >= w && lon <= e) return id;
  }
  return null;
}

function clean(s) { return String(s || '').replace(/[@\u0000]+/g, '').trim(); }

function upsert(mmsi, patch) {
  let v = vessels.get(mmsi);
  if (!v) {
    if (vessels.size >= MAX_VESSELS) prune(true);
    v = { mmsi, name: '', type: null, cls: 'unknown', lat: null, lon: null, sog: null, cog: null, hdg: null, nav: null, dest: '', draught: null, imo: null, callsign: '', ts: 0, box: null, first: Date.now() };
    vessels.set(mmsi, v);
  }
  Object.assign(v, patch);
  return v;
}

function handle(msg) {
  const meta = msg.MetaData || {};
  const mmsi = parseInt(meta.MMSI);
  if (!mmsi) return;
  state.messages++;
  const now = Date.now();
  const body = msg.Message || {};
  if (msg.MessageType === 'PositionReport' || msg.MessageType === 'StandardClassBPositionReport' || msg.MessageType === 'ExtendedClassBPositionReport') {
    const p = body.PositionReport || body.StandardClassBPositionReport || body.ExtendedClassBPositionReport || {};
    const lat = Number(p.Latitude ?? meta.latitude), lon = Number(p.Longitude ?? meta.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    state.positions++;
    const patch = { lat, lon, sog: Number.isFinite(p.Sog) ? p.Sog : null, cog: Number.isFinite(p.Cog) && p.Cog < 360 ? p.Cog : null,
      hdg: Number.isFinite(p.TrueHeading) && p.TrueHeading !== 511 ? p.TrueHeading : null, ts: now, box: boxFor(lat, lon), classB: msg.MessageType !== 'PositionReport' };
    if (p.NavigationalStatus != null) patch.nav = p.NavigationalStatus;
    const v = upsert(mmsi, patch);
    if (!v.name && meta.ShipName) v.name = clean(meta.ShipName);
    return;
  }
  if (msg.MessageType === 'ShipStaticData') {
    const s = body.ShipStaticData || {};
    const patch = { name: clean(s.Name) || clean(meta.ShipName), type: s.Type ?? null, cls: shipClass(s.Type), dest: clean(s.Destination), draught: s.MaximumStaticDraught || null, imo: s.ImoNumber || null, callsign: clean(s.CallSign) };
    const dim = s.Dimension; if (dim) patch.length = (dim.A || 0) + (dim.B || 0);
    upsert(mmsi, patch);
    return;
  }
  if (msg.MessageType === 'StaticDataReport') {
    const s = body.StaticDataReport || {};
    const patch = {};
    if (s.ReportA?.Name) patch.name = clean(s.ReportA.Name);
    if (s.ReportB?.ShipType) { patch.type = s.ReportB.ShipType; patch.cls = shipClass(s.ReportB.ShipType); }
    if (Object.keys(patch).length) upsert(mmsi, patch);
  }
}

function prune(force) {
  const cutoff = Date.now() - STALE_MS;
  for (const [k, v] of vessels) if (v.ts < cutoff || (force && !v.lat)) vessels.delete(k);
}

async function decode(data) {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (typeof data?.arrayBuffer === 'function') return Buffer.from(await data.arrayBuffer()).toString('utf8');
  return Buffer.from(data).toString('utf8');
}

function connect() {
  if (state.stopped || !state.key) return;
  if (typeof WebSocket === 'undefined') { state.lastError = 'WebSocket not available in this Node runtime'; return; }
  let ws;
  try { ws = new WebSocket(STREAM_URL); } catch (e) { state.lastError = e.message; return schedule(); }
  state.ws = ws;
  ws.onopen = () => {
    state.connected = true; state.since = Date.now(); state.backoff = 1000; state.lastError = null;
    ws.send(JSON.stringify({
      APIKey: state.key,
      BoundingBoxes: Object.values(AIS_BOXES).map(b => b.box),
      FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData', 'StaticDataReport'],
    }));
  };
  ws.onmessage = async (e) => {
    try {
      const text = await decode(e.data);
      const msg = JSON.parse(text);
      state.lastMessageAt = Date.now();
      if (msg.error) { state.lastError = String(msg.error); return; }
      handle(msg);
    } catch (err) { state.lastError = err.message; }
  };
  ws.onerror = (e) => { state.lastError = e?.message || 'websocket error'; };
  ws.onclose = (e) => {
    state.connected = false; state.ws = null;
    if (e && e.code !== 1000) state.lastError = `closed ${e.code}${e.reason ? ' ' + e.reason : ''}`;
    schedule();
  };
}
let timer = null;
function schedule() {
  if (state.stopped) return;
  clearTimeout(timer);
  const delay = state.backoff;
  state.backoff = Math.min(state.backoff * 2, 60000);
  state.reconnects++;
  timer = setTimeout(connect, delay);
}

let pruneTimer = null, watchdog = null;
export function startAisStream(key) {
  if (!key || state.key) return false;
  state.key = key; state.stopped = false;
  connect();
  pruneTimer = setInterval(() => prune(false), 5 * 60 * 1000);
  // aisstream occasionally stalls without closing; reconnect if nothing arrives for 3 minutes.
  watchdog = setInterval(() => {
    if (state.connected && state.lastMessageAt && Date.now() - state.lastMessageAt > 3 * 60 * 1000) {
      state.lastError = 'stalled; reconnecting';
      try { state.ws?.close(); } catch { /* ignore */ }
    }
  }, 30 * 1000);
  pruneTimer.unref?.(); watchdog.unref?.();
  return true;
}
export function stopAisStream() {
  state.stopped = true; clearTimeout(timer); clearInterval(pruneTimer); clearInterval(watchdog);
  try { state.ws?.close(); } catch { /* ignore */ }
}

// ---- Relay mode -----------------------------------------------------------------------------------------------
// On Cloud Run the CPU is throttled between requests, so the WebSocket runs on an always-on host instead
// (deploy/ais-relay.py) and this process fetches snapshots from it on demand. Snapshots are cached briefly so a
// dashboard poll and a sweep in the same minute share one relay call.
const relay = { url: null, token: null, cache: null, cacheAt: 0, lastError: null, lastOk: null };
const RELAY_CACHE_MS = parseInt(process.env.AIS_RELAY_CACHE_MS) || 20000;
export function configureAisRelay(url, token) {
  relay.url = String(url || '').replace(/\/+$/, '') || null;
  relay.token = token || null;
  return !!relay.url;
}
export function aisRelayEnabled() { return !!relay.url; }
async function fetchRelaySnapshot(maxVessels) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${relay.url}/snapshot?max=${maxVessels}`, { signal: controller.signal, headers: { 'X-Relay-Token': relay.token || '', 'User-Agent': 'Crucix/2.0' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`relay HTTP ${res.status}`);
    const data = await res.json();
    relay.lastError = null; relay.lastOk = Date.now();
    return data;
  } catch (e) {
    clearTimeout(timer);
    relay.lastError = e.name === 'AbortError' ? 'relay timeout' : e.message;
    throw e;
  }
}
// Async snapshot that works in both modes. In relay mode a failure returns the last good snapshot (marked stale)
// or a disconnected stub, never a throw.
export async function aisSnapshotAsync(opts = {}) {
  const maxVessels = opts.maxVessels ?? 1500;
  if (!relay.url) return state.key ? aisSnapshot(opts) : { enabled: false, connected: false, vessels: [], boxes: {}, liveVessels: 0 };
  const now = Date.now();
  if (relay.cache && now - relay.cacheAt < RELAY_CACHE_MS && (relay.cache.vessels || []).length >= Math.min(maxVessels, relay.cache.liveVessels || 0)) {
    return { ...relay.cache, vessels: (relay.cache.vessels || []).slice(0, maxVessels), cached: true };
  }
  try {
    const data = await fetchRelaySnapshot(Math.max(maxVessels, 1500));
    relay.cache = { ...data, relayUrl: relay.url }; relay.cacheAt = now;
    return { ...relay.cache, vessels: (data.vessels || []).slice(0, maxVessels) };
  } catch (e) {
    if (relay.cache) return { ...relay.cache, vessels: (relay.cache.vessels || []).slice(0, maxVessels), stale: true, lastError: relay.lastError };
    return { enabled: true, connected: false, relayUrl: relay.url, lastError: relay.lastError, vessels: [], boxes: {}, liveVessels: 0, tracked: 0 };
  }
}
export function aisEnabled() { return !!relay.url || !!state.key; }

export function aisStats() {
  return {
    enabled: !!state.key, connected: state.connected, since: state.since ? new Date(state.since).toISOString() : null,
    lastMessageAt: state.lastMessageAt ? new Date(state.lastMessageAt).toISOString() : null,
    messages: state.messages, positions: state.positions, reconnects: state.reconnects, tracked: vessels.size, lastError: state.lastError,
    boxes: Object.keys(AIS_BOXES).length,
  };
}

// Snapshot of vessels heard in the last hour: per-box summary plus a capped vessel list (most recent first).
export function aisSnapshot({ maxVessels = 1500, windowMs = LIVE_WINDOW_MS } = {}) {
  const cutoff = Date.now() - windowMs;
  const live = [...vessels.values()].filter(v => v.lat != null && v.ts >= cutoff);
  const boxes = {};
  for (const [id, b] of Object.entries(AIS_BOXES)) boxes[id] = { id, label: b.label, box: b.box, vessels: 0, anchored: 0, moving: 0, tanker: 0, cargo: 0, passenger: 0, military: 0, other: 0 };
  for (const v of live) {
    const b = v.box && boxes[v.box]; if (!b) continue;
    b.vessels++;
    const anchored = v.nav === 1 || v.nav === 5 || (v.sog != null && v.sog < 0.5);
    if (anchored) b.anchored++; else b.moving++;
    if (v.cls === 'tanker') b.tanker++; else if (v.cls === 'cargo') b.cargo++; else if (v.cls === 'passenger') b.passenger++; else if (v.cls === 'military' || v.cls === 'law') b.military++; else b.other++;
  }
  live.sort((a, b) => b.ts - a.ts);
  const list = live.slice(0, maxVessels).map(v => ({
    mmsi: v.mmsi, name: v.name || null, cls: v.cls, type: v.type, lat: +v.lat.toFixed(4), lon: +v.lon.toFixed(4),
    sog: v.sog != null ? +v.sog.toFixed(1) : null, cog: v.cog != null ? Math.round(v.cog) : null, nav: v.nav ?? null,
    dest: v.dest || null, len: v.length || null, box: v.box, ts: new Date(v.ts).toISOString(),
  }));
  return { ...aisStats(), windowMinutes: Math.round(windowMs / 60000), liveVessels: live.length, boxes, vessels: list };
}
