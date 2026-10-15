import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyTheme, persistTheme, readStoredTheme, resolveTheme, toggleTheme, type StorageLike, type Theme,
} from '../../../../shared/theme';
import { safeStorage } from '../../utils';
import type { ThemeModeValue } from '../../types';

export interface UseThemeModeStateArgs {
  storage?: StorageLike | null;
}

export function useThemeModeState({ storage }: UseThemeModeStateArgs = {}): ThemeModeValue {
  const store = storage === undefined ? safeStorage() : storage;
  const [mode, setMode] = useState<Theme>(() => resolveTheme(readStoredTheme(store)));

  useEffect(() => {
    if (typeof document !== 'undefined') applyTheme(mode, document.documentElement);
  }, [mode]);

  useEffect(() => {
    persistTheme(mode, store);
  }, [mode, store]);

  const onToggleMode = useCallback(() => {
    setMode((current) => toggleTheme(current));
  }, []);

  return useMemo(() => ({ mode, onToggleMode }), [mode, onToggleMode]);
}
