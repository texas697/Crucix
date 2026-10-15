import { useContext } from 'react';
import { ThemeModeContext } from '../../context';
import type { ThemeModeValue } from '../../types';

export function useThemeMode(): ThemeModeValue {
  return useContext(ThemeModeContext);
}
