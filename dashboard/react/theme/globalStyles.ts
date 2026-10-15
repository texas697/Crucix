import type { Interpolation, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS, LOGIN_TOKENS, type CrucixTokens } from './tokens';

function cssVariables(t: CrucixTokens): Record<string, string> {
  return {
    '--bg': t.bg, '--panel': t.panel, '--panel-2': t.panel2, '--raised': t.raised, '--raised-2': t.raised2,
    '--glass': t.glass, '--border': t.border, '--border-bright': t.borderBright,
    '--text': t.text, '--text-2': t.text2, '--sub': t.sub, '--dim': t.dim, '--dim-2': t.dim2, '--dim-3': t.dim3,
    '--accent': t.accent, '--accent2': t.accent2, '--accent-2': t.accentSecondary, '--accent-soft': t.accentSoft,
    '--on-accent': t.onAccent, '--green': t.green, '--red': t.red, '--amber': t.amber, '--blue': t.blue,
    '--violet': t.violet, '--orange': t.orange, '--warn': t.warn, '--danger': t.danger, '--mint': t.mint,
    '--sky': t.sky, '--seg-bg': t.segBg, '--mono': FONT_MONO, '--sans': FONT_SANS,
  };
}

const LOGIN_VARIABLES: Record<string, string> = {
  '--bg': LOGIN_TOKENS.bg, '--panel': LOGIN_TOKENS.panel, '--border': LOGIN_TOKENS.border,
  '--border-bright': LOGIN_TOKENS.borderBright, '--text': LOGIN_TOKENS.text, '--dim': LOGIN_TOKENS.dim,
  '--accent': LOGIN_TOKENS.accent, '--accent2': LOGIN_TOKENS.accent2, '--warn': LOGIN_TOKENS.warn,
  '--danger': LOGIN_TOKENS.danger, '--mono': LOGIN_TOKENS.mono, '--sans': LOGIN_TOKENS.sans,
};

export function createGlobalStyles(theme: Theme): Interpolation<Theme> {
  const t = theme.palette.crucix;
  return {
    ':root': cssVariables(t),
    'html, body': {
      margin: 0,
      padding: 0,
      minHeight: '100%',
      background: t.bg,
      color: t.text,
    },
    body: {
      fontFamily: FONT_SANS,
      lineHeight: 'normal',
      WebkitFontSmoothing: 'antialiased',
      WebkitTextSizeAdjust: '100%',
    },
    '#root': { minHeight: '100vh' },
    '[data-surface] *, [data-surface] *::before, [data-surface] *::after': {
      boxSizing: 'border-box',
      margin: 0,
      padding: 0,
    },
    "[data-surface='login']": LOGIN_VARIABLES,
    '::-webkit-scrollbar': { width: 8, height: 8 },
    '::-webkit-scrollbar-thumb': { background: theme.palette.mode === 'light' ? '#c3cad6' : '#1a2030', borderRadius: 5 },
    '::-webkit-scrollbar-track': { background: 'transparent' },
    '.maplibregl-canvas': { outline: 'none' },
    '.maplibregl-ctrl-attrib, .maplibregl-ctrl-bottom-left': { display: 'none' },
    '.maplibregl-popup-content': {
      background: t.panel,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      fontFamily: FONT_SANS,
    },
    '.maplibregl-popup-anchor-bottom .maplibregl-popup-tip': { borderTopColor: t.panel },
    'video::-webkit-media-controls-panel': { background: 'transparent' },
  };
}
