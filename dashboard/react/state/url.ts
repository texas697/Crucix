export interface ParsedUrl {
  path: string[];
  q: Record<string, string>;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function parseUrl(href: string): ParsedUrl {
  const url = new URL(href);
  return {
    path: url.pathname.split('/').filter(Boolean).map(decodeSegment),
    q: Object.fromEntries(url.searchParams.entries()),
  };
}

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

export interface LngLat { lat: number; lng: number }

export type Shape =
  | { kind: 'circle'; center: LngLat; radiusKm: number }
  | { kind: 'rect'; sw: LngLat; ne: LngLat }
  | { kind: 'poly'; ring: LngLat[] };

const n3 = (v: number): string => v.toFixed(3);

function openRing(ring: LngLat[]): LngLat[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = ring.length > 1 && first && last && first.lat === last.lat && first.lng === last.lng;
  return isClosed ? ring.slice(0, -1) : ring;
}

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
  return `p:${openRing(shape.ring).map((p) => `${n3(p.lat)},${n3(p.lng)}`).join(';')}`;
}

function circleFromBody(body: string): Shape | null {
  const [lat, lng, r] = body.split(',').map(Number);
  if (![lat, lng, r].every(Number.isFinite)) return null;
  return { kind: 'circle', center: { lat: lat as number, lng: lng as number }, radiusKm: r as number };
}

function rectFromBody(body: string): Shape | null {
  const [s, w, n, e] = body.split(',').map(Number);
  if (![s, w, n, e].every(Number.isFinite)) return null;
  return { kind: 'rect', sw: { lat: s as number, lng: w as number }, ne: { lat: n as number, lng: e as number } };
}

function polyFromBody(body: string): Shape | null {
  const points = body
    .split(';')
    .map((pair) => pair.split(',').map(Number))
    .filter((a) => a.length === 2 && a.every(Number.isFinite))
    .map(([lat, lng]) => ({ lat: lat as number, lng: lng as number }));
  return points.length >= 3 ? { kind: 'poly', ring: points } : null;
}

export function shapeFromUrl(raw: string | null | undefined): Shape | null {
  const [kind, body] = String(raw ?? '').split(':');
  if (!body) return null;
  if (kind === 'c') return circleFromBody(body);
  if (kind === 'r') return rectFromBody(body);
  if (kind === 'p') return polyFromBody(body);
  return null;
}

export function pinToUrl(point: LngLat): string {
  return `${n3(point.lat)},${n3(point.lng)}`;
}
