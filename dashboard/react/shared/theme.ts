export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'crucix_theme';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readStoredTheme(storage: StorageLike | null | undefined): Theme | null {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function resolveTheme(stored: Theme | null): Theme {
  return stored ?? 'dark';
}

export function toggleTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function persistTheme(theme: Theme, storage: StorageLike | null | undefined): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
}

export function applyTheme(theme: Theme, root: Element): void {
  root.classList.toggle('light', theme === 'light');
}
