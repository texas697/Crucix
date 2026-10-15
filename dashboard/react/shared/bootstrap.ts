const PUBLIC_BOOTSTRAP_KEYS = new Set([
  'locale',
  'language',
  'capabilities',
  'login',
  'hasTavily',
  'appName',
]);

export function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function selectPublicBootstrap(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(config)) {
    if (PUBLIC_BOOTSTRAP_KEYS.has(key)) out[key] = config[key];
  }
  return out;
}

export function serializeBootstrap(config: Record<string, unknown>): string {
  const safe = selectPublicBootstrap(config);
  return `window.__CRUCIX_BOOT__=${escapeJsonForScript(safe)};`;
}
