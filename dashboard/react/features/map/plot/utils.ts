import type * as GeoJSON from 'geojson';
import { COLORS, GDELT_SEVERITY, RADIUS } from './consts';
import type { LooseRecord, MapPoint } from './types';

export const asRec = (v: unknown): LooseRecord =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as LooseRecord) : {};
export const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const recs = (v: unknown): LooseRecord[] =>
  asArr(v).filter((r): r is LooseRecord => !!r && typeof r === 'object' && !Array.isArray(r));
export const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
export const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
export const str = (v: unknown): string => (typeof v === 'string' ? v : '');
export const bool = (v: unknown): boolean => v === true;
export const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function cleanText(t: unknown): string {
  return esc(
    String(t ?? '')
      .replace(/&#39;/g, "'")
      .replace(/&#33;/g, '!')
      .replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, ''),
  );
}

export function relTime(iso: unknown, now: number): string {
  const m = Math.round((now - new Date(String(iso)).getTime()) / 60000);
  if (!isFinite(m) || m < 0) return '';
  if (m < 60) return m + 'm ago';
  if (m < 48 * 60) return Math.round(m / 60) + 'h ago';
  return Math.round(m / 1440) + 'd ago';
}

export function getAge(d: unknown, now: number): string {
  const ms = now - new Date(String(d)).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export function magColor(m: number): string {
  return m >= 6 ? COLORS.quake6 : m >= 5 ? COLORS.quake5 : m >= 4 ? COLORS.quake4 : COLORS.quakeMinor;
}

export function gdeltSeverity(t: unknown): number {
  return GDELT_SEVERITY[str(t)] || 0;
}

export function fmtUsvh(v: unknown): string {
  const n = numOrNull(v);
  return n == null ? '--' : (n < 0.01 ? '<0.01' : n.toFixed(2)) + ' µSv/h';
}

export function riskMax(risk: unknown): string {
  return typeof risk === 'string' ? risk : str(asRec(risk).max);
}

export function fadeStroke(col: string, alpha = '0.25'): string {
  return col.replace(/[\d.]+\)$/, `${alpha})`);
}

export function dimSpan(text: string, opacity = '.7'): string {
  return `<span style="opacity:${opacity}">${text}</span>`;
}

export function severeGdelt(gdelt: LooseRecord): LooseRecord[] {
  return asArr(gdelt.geoPoints).filter((g) => {
    const r = asRec(g);
    return !!r.lat && !!r.lon && gdeltSeverity(r.worst) >= 4;
  }) as LooseRecord[];
}

export function ptFeat(p: MapPoint): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {
      head: p.popHead || '',
      text: p.popText || '',
      meta: p.popMeta || '',
      url: p.url || '',
      type: p.type,
      heading: p.heading ?? 0,
      label: p.label || '',
      isNew: p._new ? '1' : '0',
      color: p.color || COLORS.defaultPoint,
      stroke: p._stroke || COLORS.defaultStroke,
      r: Math.max(RADIUS.minPoint, Math.min(RADIUS.maxPoint, p._r != null ? p._r : (p.size || 0.3) * 12)),
    },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  };
}

export function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}
