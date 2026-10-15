import type { Translator } from '../../shared/locale';

export type Label = (key: string, fallback?: string) => string;

function hasKey(t: Translator | undefined, key: string): boolean {
  return !!t && typeof t.has === 'function' ? t.has(key) : false;
}

export function makeLabel(t: Translator | undefined): Label {
  return (key, fallback) => (hasKey(t, key) ? t!(key) : (fallback ?? key));
}
