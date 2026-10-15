// Theme adapter. Ports the legacy behavior: the theme is stored in localStorage under
// `crucix_theme`, defaults to dark, and is applied by toggling the `light` class on <html> so the
// pre-paint script and existing stylesheets keep working.

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'crucix_theme';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Stored theme, or null when unset/invalid. Never throws on denied storage. */
export function readStoredTheme(storage: StorageLike | null | undefined): Theme | null {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** Legacy default is dark. */
export function resolveTheme(stored: Theme | null): Theme {
  return stored ?? 'dark';
}

export function toggleTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function persistTheme(theme: Theme, storage: StorageLike | null | undefined): void {
  try { storage?.setItem(THEME_STORAGE_KEY, theme); } catch { /* storage denied — keep the in-memory theme */ }
}

/** Apply the theme by toggling the `light` class on the document root. */
export function applyTheme(theme: Theme, root: Element): void {
  root.classList.toggle('light', theme === 'light');
}
