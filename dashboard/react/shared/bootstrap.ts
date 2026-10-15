// Safe bootstrap of allowlisted public data into the page. React pages receive locale, capabilities
// and login configuration only — never `config`, credentials or complete user records. The
// serialized JSON escapes `<` (and the JS line separators) so it cannot terminate the script block.

/** Keys that may be serialized into the page. Anything else is dropped. */
const PUBLIC_BOOTSTRAP_KEYS = new Set([
  'locale',
  'language',
  'capabilities',
  'login',
  'hasTavily',
  'appName',
]);

/** JSON with `<`, U+2028 and U+2029 escaped so the value is safe inside a `<script>`. */
export function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    // eslint-disable-next-line no-control-regex
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Pick only allowlisted public keys from a config object. */
export function selectPublicBootstrap(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(config)) {
    if (PUBLIC_BOOTSTRAP_KEYS.has(key)) out[key] = config[key];
  }
  return out;
}

/** Build the `<script>` body that assigns the allowlisted bootstrap to `window.__CRUCIX_BOOT__`. */
export function serializeBootstrap(config: Record<string, unknown>): string {
  const safe = selectPublicBootstrap(config);
  return `window.__CRUCIX_BOOT__=${escapeJsonForScript(safe)};`;
}
