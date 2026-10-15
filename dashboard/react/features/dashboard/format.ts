export function relTime(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return '';
  const m = Math.round((nowMs - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(m) || m < 0) return '';
  if (m < 60) return `${m}m ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

export function getAge(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return '';
  const ms = nowMs - new Date(iso).getTime();
  if (!(ms >= 0)) return '';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function shortAge(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return '';
  const min = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}

export function formatUsd(u: number | null | undefined): string | null {
  if (u == null) return null;
  if (u === 0) return '$0.0000';
  if (u < 0.0001) return '<$0.0001';
  return `$${u.toFixed(u < 0.01 ? 4 : u < 1 ? 3 : 2)}`;
}

export function srcClass(source: string | null | undefined): string {
  if (!source) return 'other';
  const s = source.toLowerCase();
  if (s.includes('dw africa') || s.includes('africa news') || s.includes('nyt africa') || s.includes('rfi')) return 'af';
  if (s.includes('mercopress')) return 'sa';
  if (s.includes('indian express') || s.includes('the hindu')) return 'ind';
  if (s.includes('sbs')) return 'anz';
  if (s.includes('bbc')) return 'bbc';
  if (s.includes('jazeera') || s.includes('alj')) return 'alj';
  if (s.includes('gdelt')) return 'gdelt';
  if (s.includes('npr')) return 'us';
  if (s.includes('dw') || s.includes('deutsche')) return 'dw';
  if (s.includes('france') || s.includes('euronews')) return 'eu';
  if (s.includes('nyt') || s.includes('times')) return 'nyt';
  return 'other';
}

const GDELT_SEVERITY: Record<string, number> = {
  'Mass violence': 6, 'Armed clash': 5, Assault: 4, Coercion: 3, 'Force posture': 2, Protest: 1,
};

export function gdeltSeverity(type: string | null | undefined): number {
  return (type ? GDELT_SEVERITY[type] : 0) ?? 0;
}

export function magColor(mag: number): string {
  return mag >= 6 ? '#ff5f63' : mag >= 5 ? '#ff8a5c' : mag >= 4 ? '#ffa94d' : '#f2c879';
}

export function decodeText(text: string | null | undefined): string {
  return (text || '')
    .replace(/&#39;/g, "'")
    .replace(/&#33;/g, '!')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '');
}
