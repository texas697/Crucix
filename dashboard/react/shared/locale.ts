// Locale adapter. Ports the legacy dashboard `t()`: a dotted-path lookup into the injected locale
// dictionary with a fallback string, plus `{name}` interpolation. Every page declares lang="en"; only
// the dashboard uses this, with a server-selected language.

/** Resolve a dotted path (`panels.nuclearWatch`) against a nested object. */
export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Replace `{name}` placeholders; unknown placeholders are left verbatim. */
export function interpolate(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
}

export interface Translator {
  (key: string, vars?: Record<string, unknown>): string;
  has(key: string): boolean;
}

/** Build a translator over `dict`, falling back to `fallbackDict` (e.g. English) and then the key. */
export function createTranslator(dict: unknown, fallbackDict?: unknown): Translator {
  const lookup = (key: string): unknown => {
    const value = getPath(dict, key);
    if (value !== undefined && value !== null) return value;
    return fallbackDict === undefined ? undefined : getPath(fallbackDict, key);
  };
  const translator = ((key: string, vars?: Record<string, unknown>): string => {
    const value = lookup(key);
    if (value === undefined || value === null) return key;
    return interpolate(String(value), vars);
  }) as Translator;
  translator.has = (key: string): boolean => {
    const value = lookup(key);
    return value !== undefined && value !== null;
  };
  return translator;
}
