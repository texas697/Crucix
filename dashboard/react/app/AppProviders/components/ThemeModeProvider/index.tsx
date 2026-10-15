import { useMemo, type ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider } from '@mui/material/styles';
import type { StorageLike } from '../../../../shared/theme';
import { createAppTheme, createGlobalStyles } from '../../../../theme';
import { ThemeModeContext } from '../../context';
import { useThemeModeState } from '../../hooks/useThemeModeState';

export interface ThemeModeProviderProps {
  children: ReactNode;
  storage?: StorageLike | null;
}

export function ThemeModeProvider({ children, storage }: ThemeModeProviderProps) {
  const value = useThemeModeState({ storage });
  const theme = useMemo(() => createAppTheme(value.mode), [value.mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={createGlobalStyles} />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
