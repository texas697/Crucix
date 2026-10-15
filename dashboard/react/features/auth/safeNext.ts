// Open-redirect guard for the login `next` parameter (D2 fix).
//
// The legacy page (dashboard/auth/login.html line 81) only rejected `//`:
//     const n = params.get('next') || '/';
//     return n.startsWith('/') && !n.startsWith('//') ? n : '/';
// That still lets through values the URL parser turns into a *different* origin — `/\evil.com`
// (browsers treat `\` as `/`, so `/\evil.com` is `//evil.com`), `https://evil.com`, and
// `javascript:` URLs. safeNext closes those by parsing against the trusted origin and rejecting any
// backslash-prefixed path (raw starts with `/\`). It returns `raw` only when it is a genuine
// same-origin path beginning with a single `/`; otherwise it collapses to `/`.

/** Bare origin such as `https://example.com` (no trailing slash), as `location.origin` gives. */
export function safeNext(raw: string | null | undefined, origin: string): string {
  if (!raw) return '/';
  // Protocol-relative (`//host`) and backslash-smuggled (`/\host`, which the URL parser normalizes
  // to the same thing) both leave the origin, so reject them before parsing.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  // Must be an absolute same-origin path, never a relative path or an absolute URL.
  if (!raw.startsWith('/')) return '/';

  let parsed: URL;
  try {
    parsed = new URL(raw, origin);
  } catch {
    return '/';
  }
  // `https://evil.com`, `javascript:alert(1)` (origin "null") and friends fail this check.
  if (parsed.origin !== origin) return '/';
  return raw;
}

/**
 * Build the `/login?next=…` href used by gated surfaces that bounce an expired session. The `next`
 * value is validated first so the redirect can never be pointed off-origin by a crafted link.
 */
export function loginRedirectHref(next: string | null | undefined, origin: string): string {
  return '/login?next=' + encodeURIComponent(safeNext(next, origin));
}
