import type { PaletteOptions } from '@mui/material/styles';
import { tokensForMode, type CrucixTokens, type ThemeMode } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    crucix: CrucixTokens;
  }
  interface PaletteOptions {
    crucix?: CrucixTokens;
  }
}

export function createPalette(mode: ThemeMode): PaletteOptions {
  const t = tokensForMode(mode);
  return {
    mode,
    crucix: t,
    primary: { main: t.accent, light: t.accent2, dark: t.accent2, contrastText: t.onAccent },
    secondary: { main: t.sub, light: t.dim, dark: t.text2, contrastText: t.bg },
    success: { main: t.green, light: t.mint, dark: t.green, contrastText: t.bg },
    error: { main: t.red, light: t.danger, dark: t.red, contrastText: t.bg },
    warning: { main: t.amber, light: t.warn, dark: t.orange, contrastText: t.bg },
    info: { main: t.blue, light: t.sky, dark: t.blue, contrastText: t.bg },
    background: { default: t.bg, paper: t.panel },
    text: { primary: t.text, secondary: t.sub, disabled: t.dim3 },
    divider: t.border,
    action: {
      active: t.text2,
      hover: t.raised,
      selected: t.raised2,
      disabled: t.dim3,
      disabledBackground: t.raised,
      focus: t.accentSoft,
    },
  };
}
