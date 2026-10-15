import { asRec, num } from '../../coerce';
import type { AlertItem, MarketItem, QuakeItem, TrackItem } from '../../types';
import { ALERT_WINDOW_MS, MARKET_KEYWORDS, MARKET_LIMIT } from './consts';

function asList(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function alertSeconds(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
    const ms = Date.parse(s);
    return Number.isFinite(ms) ? ms / 1000 : null;
  }
  return null;
}

export function reshapeTracks(payload: unknown): TrackItem[] {
  return asList(asRec(payload).tracks) as TrackItem[];
}

export function reshapeAlerts(payload: unknown, nowMs: number): AlertItem[] {
  const recent: AlertItem[] = [];
  for (const raw of asList(asRec(payload).items)) {
    const a = asRec(raw);
    const secs = alertSeconds(a.time);
    if (secs == null || nowMs / 1000 - secs >= ALERT_WINDOW_MS / 1000) continue;
    recent.push({ ...(a as AlertItem), time: typeof a.time === 'string' ? a.time : String(a.time) });
  }
  return recent;
}

export function reshapeQuakes(payload: unknown): QuakeItem[] {
  const items: QuakeItem[] = [];
  for (const raw of asList(asRec(payload).features)) {
    const f = asRec(raw);
    const props = asRec(f.properties);
    const coords = asList(asRec(f.geometry).coordinates);
    const lat = typeof coords[1] === 'number' ? coords[1] : null;
    const lon = typeof coords[0] === 'number' ? coords[0] : null;
    if (lat == null || lon == null) continue;
    let ts: string | null = null;
    if (typeof props.time === 'number' || typeof props.time === 'string') {
      const d = new Date(props.time);
      ts = Number.isFinite(d.getTime()) ? d.toISOString() : null;
    }
    items.push({
      id: typeof f.id === 'string' ? f.id : undefined,
      mag: num(props.mag, 0),
      place: typeof props.place === 'string' ? props.place : '',
      lat,
      lon,
      depth: typeof coords[2] === 'number' ? coords[2] : null,
      ts,
      url: typeof props.url === 'string' ? props.url : null,
      tsunami: typeof props.tsunami === 'number' || typeof props.tsunami === 'boolean' ? props.tsunami : null,
    });
  }
  items.sort((a, b) => num(b.mag) - num(a.mag));
  return items;
}

function outcomePrices(m: Record<string, unknown>): unknown[] {
  try {
    const parsed: unknown = JSON.parse(typeof m.outcomePrices === 'string' ? m.outcomePrices : '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function reshapeMarkets(payload: unknown): MarketItem[] {
  const items: MarketItem[] = [];
  for (const raw of asList(payload)) {
    const ev = asRec(raw);
    const title = typeof ev.title === 'string' ? ev.title : '';
    if (!MARKET_KEYWORDS.test(title)) continue;
    const markets = asList(ev.markets);
    if (!markets.length) continue;
    const m = asRec(markets[0]);
    const first = outcomePrices(m)[0];
    const yes = first != null ? Number(first) : null;
    if (yes == null || Number.isNaN(yes)) continue;
    const vol = Number(m.volume24hr || ev.volume24hr || 0);
    items.push({ title, yes, vol: Number.isFinite(vol) ? vol : 0, slug: typeof ev.slug === 'string' ? ev.slug : undefined });
    if (items.length >= MARKET_LIMIT) break;
  }
  return items;
}
