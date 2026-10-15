export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function interpolate(template: string, vars?: Record<string, unknown>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);
}

export interface Translator {
  (key: string, vars?: Record<string, unknown>): string;
  has(key: string): boolean;
}

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
