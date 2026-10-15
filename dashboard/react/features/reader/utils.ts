export function ago(iso: string | undefined, nowMs: number): string {
  if (!iso) return '';
  const ms = nowMs - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function articlePath(id: string, suffix = ''): string {
  return `/api/digest/${encodeURIComponent(id)}${suffix}`;
}
