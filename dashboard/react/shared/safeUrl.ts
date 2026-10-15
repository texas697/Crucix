// Safe external URL handling. The same HTTP(S) allowlist applies to markdown links, source/citation
// links, map popups and original-article links, so sanitizing here keeps every call site consistent.

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Returns the normalized absolute URL when `raw` resolves to http(s), otherwise null. Ports the
 * legacy `safeExternalUrl`: relative URLs resolve against `base` (defaulting to the page URL), and
 * `javascript:`, `data:`, protocol-relative oddities and unparseable strings are rejected.
 */
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
