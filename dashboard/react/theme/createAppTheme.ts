import { createTheme, type Theme } from '@mui/material/styles';
import { createComponents } from './components';
import { createPalette } from './palette';
import { createTypography } from './typography';
import type { ThemeMode } from './tokens';

export function createAppTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: createPalette(mode),
    typography: createTypography(),
    shape: { borderRadius: 6 },
    spacing: 4,
    mixins: { toolbar: { minHeight: 0 } },
    components: createComponents(mode),
  });
}
