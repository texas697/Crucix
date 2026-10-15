export function safeNext(raw: string | null | undefined, origin: string): string {
  if (!raw) return '/';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (!raw.startsWith('/')) return '/';

  let parsed: URL;
  try {
    parsed = new URL(raw, origin);
  } catch {
    return '/';
  }
  if (parsed.origin !== origin) return '/';
  return raw;
}

export function loginRedirectHref(next: string | null | undefined, origin: string): string {
  return '/login?next=' + encodeURIComponent(safeNext(next, origin));
}
