import type { DigestListResponse, TasteEntry } from './types';

export function ago(iso: string | undefined, nowMs: number): string {
  if (!iso) return '';
  const ms = nowMs - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function statusLine(r: DigestListResponse): string {
  const total = r.total ?? 0;
  const storeSize = r.storeSize ?? 0;
  const votes = r.votes ?? 0;
  const min = r.minVotesForAffinity ?? 0;
  const mode = r.mode === 'affinity'
    ? 'RANKED FOR YOU'
    : `CHRONOLOGICAL${votes < min ? ` (${min - votes} MORE RATINGS TO PERSONALISE)` : ''}`;
  return `${total} PIECES · ${storeSize} IN LIBRARY · ${mode}`;
}

export function tasteTopics(list: TasteEntry[] | undefined): string[] {
  return (list ?? []).map((l) => (typeof l === 'string' ? l : l.topic));
}
