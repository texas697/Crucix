// The address bar as the source of truth for shareable UI state. Ports dashboard/public/js/urlstate.js
// (parse/build/set semantics) plus the dashboard's circle/rectangle/polygon encodings, as pure
// functions so every surface shares one tested implementation.

export interface ParsedUrl {
  path: string[];
  q: Record<string, string>;
}

/** Split a URL into decoded path segments and query params (legacy `UrlState.parse`). */
export function parseUrl(href: string): ParsedUrl {
  const url = new URL(href);
  return {
    path: url.pathname
      .split('/')
      .filter(Boolean)
      .map((s) => { try { return decodeURIComponent(s); } catch { return s; } }),
    q: Object.fromEntries(url.searchParams.entries()),
  };
}

/** Build `/seg/seg?k=v`, dropping empty/null/undefined/false params (legacy `UrlState.build`). */
export function buildUrl(path: string | string[], q: Record<string, unknown> = {}): string {
  const segments = (Array.isArray(path) ? path : String(path ?? '').split('/'))
    .filter((s) => s !== '' && s != null)
    .map((s) => encodeURIComponent(s));
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== '' && v !== false) search.set(k, String(v));
  }
  const s = search.toString();
  return `/${segments.join('/')}${s ? `?${s}` : ''}`;
}

// ─── Geometry codecs ────────────────────────────────────────────────────────
export interface LngLat { lat: number; lng: number }

export type Shape =
  | { kind: 'circle'; center: LngLat; radiusKm: number }
  | { kind: 'rect'; sw: LngLat; ne: LngLat }
  | { kind: 'poly'; ring: LngLat[] };

const n3 = (v: number): string => v.toFixed(3);

/** Encode a drawn shape into the URL form: `c:lat,lng,r`, `r:s,w,n,e`, or `p:lat,lng;…`. */
export function shapeToUrl(shape: Shape | null | undefined): string {
  if (!shape) return '';
  if (shape.kind === 'circle') {
    return `c:${n3(shape.center.lat)},${n3(shape.center.lng)},${Math.round(shape.radiusKm)}`;
  }
  if (shape.kind === 'rect') {
    const lats = [shape.sw.lat, shape.ne.lat];
    const lngs = [shape.sw.lng, shape.ne.lng];
    return `r:${n3(Math.min(...lats))},${n3(Math.min(...lngs))},${n3(Math.max(...lats))},${n3(Math.max(...lngs))}`;
  }
  let ring = shape.ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length > 1 && first && last && first.lat === last.lat && first.lng === last.lng) ring = ring.slice(0, -1);
  return `p:${ring.map((p) => `${n3(p.lat)},${n3(p.lng)}`).join(';')}`;
}

/** Decode a shape URL back into a Shape, or null for malformed input (legacy `shapeFromUrl`). */
export function shapeFromUrl(raw: string | null | undefined): Shape | null {
  try {
    const [kind, body] = String(raw ?? '').split(':');
    if (!body) return null;
    if (kind === 'c') {
      const [lat, lng, r] = body.split(',').map(Number);
      if ([lat, lng, r].every(Number.isFinite)) {
        return { kind: 'circle', center: { lat: lat as number, lng: lng as number }, radiusKm: r as number };
      }
    }
    if (kind === 'r') {
      const [s, w, n, e] = body.split(',').map(Number);
      if ([s, w, n, e].every(Number.isFinite)) {
        return { kind: 'rect', sw: { lat: s as number, lng: w as number }, ne: { lat: n as number, lng: e as number } };
      }
    }
    if (kind === 'p') {
      const points = body
        .split(';')
        .map((pair) => pair.split(',').map(Number))
        .filter((a) => a.length === 2 && a.every(Number.isFinite))
        .map(([lat, lng]) => ({ lat: lat as number, lng: lng as number }));
      if (points.length >= 3) return { kind: 'poly', ring: points };
    }
  } catch { /* malformed */ }
  return null;
}

/** Encode a pin as `lat,lng` with the legacy 3-decimal precision. */
export function pinToUrl(point: LngLat): string {
  return `${n3(point.lat)},${n3(point.lng)}`;
}
