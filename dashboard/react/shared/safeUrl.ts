const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

export function safeExternalUrl(raw: unknown, base?: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const origin = base ?? (typeof location !== 'undefined' ? location.href : undefined);
  try {
    const url = new URL(raw, origin);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isSafeExternalUrl(raw: unknown, base?: string): boolean {
  return safeExternalUrl(raw, base) !== null;
}
