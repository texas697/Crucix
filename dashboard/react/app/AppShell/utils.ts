import type { UserProfile } from '../../api/types';

export function sweepAge(iso: string | null | undefined, nowMs: number): string {
  if (!iso) return '—';
  const min = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60000));
  return min < 1 ? 'now' : `${min}m ago`;
}

export function modelLabel(me: UserProfile | null): string {
  return me?.llm?.provider?.toUpperCase() || 'Grok';
}

export function accountName(me: UserProfile | null): string {
  return ((me?.email || '').split('@')[0] ?? '').toUpperCase();
}
