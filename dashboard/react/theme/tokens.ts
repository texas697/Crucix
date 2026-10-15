export type ThemeMode = 'light' | 'dark';

export interface CrucixTokens {
  bg: string;
  panel: string;
  panel2: string;
  raised: string;
  raised2: string;
  glass: string;
  border: string;
  borderBright: string;
  text: string;
  text2: string;
  sub: string;
  dim: string;
  dim2: string;
  dim3: string;
  accent: string;
  accent2: string;
  accentSecondary: string;
  accentSoft: string;
  onAccent: string;
  green: string;
  red: string;
  amber: string;
  blue: string;
  violet: string;
  orange: string;
  warn: string;
  danger: string;
  mint: string;
  sky: string;
  segBg: string;
  tabSelectedBg: string;
  tabSelectedShadow: string;
}

export const FONT_SANS = "'Geist', system-ui, -apple-system, sans-serif";
export const FONT_MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const STATUS = {
  green: '#69d6aa',
  red: '#ed756e',
  amber: '#e6b55d',
  blue: '#6fb3e5',
  violet: '#b093e5',
  orange: '#f1944f',
};

export const DARK_TOKENS: CrucixTokens = {
  bg: '#05070b',
  panel: '#0a0d14',
  panel2: '#080b11',
  raised: '#111520',
  raised2: '#171c2a',
  glass: 'rgba(10,13,20,0.8)',
  border: 'rgba(255,255,255,0.05)',
  borderBright: 'rgba(255,255,255,0.14)',
  text: '#e9ecf2',
  text2: '#c8cedb',
  sub: '#98a1b3',
  dim: '#8a94a8',
  dim2: '#67718a',
  dim3: '#586279',
  accent: '#d8dfe6',
  accent2: '#b9bec4',
  accentSecondary: '#a6abb1',
  accentSoft: 'rgba(220,226,236,0.15)',
  onAccent: '#0a0f1f',
  ...STATUS,
  warn: '#e9c9a0',
  danger: '#ffb4ab',
  mint: '#8fe3c9',
  sky: '#8fb8d8',
  segBg: '#07090e',
  tabSelectedBg: '#171c2a',
  tabSelectedShadow: 'none',
};

export const LIGHT_TOKENS: CrucixTokens = {
  bg: '#eef1f6',
  panel: '#ffffff',
  panel2: '#f6f8fc',
  raised: '#eef1f7',
  raised2: '#e3e8f1',
  glass: 'rgba(255,255,255,0.85)',
  border: 'rgba(16,24,40,0.10)',
  borderBright: 'rgba(16,24,40,0.22)',
  text: '#0f172a',
  text2: '#334155',
  sub: '#475569',
  dim: '#5b6b82',
  dim2: '#6b7a90',
  dim3: '#8593a8',
  accent: '#636a71',
  accent2: '#7b8187',
  accentSecondary: '#7b8187',
  accentSoft: 'rgba(30,41,59,0.12)',
  onAccent: '#f5f7fa',
  ...STATUS,
  warn: '#8a5a12',
  danger: '#b3261e',
  mint: '#0f7a5a',
  sky: '#2b5f86',
  segBg: '#e6eaf1',
  tabSelectedBg: '#ffffff',
  tabSelectedShadow: '0 1px 3px rgba(16,24,40,0.14)',
};

export const LOGIN_TOKENS = {
  bg: '#05070b',
  panel: 'rgba(10,13,20,0.82)',
  border: 'rgba(220,226,236,0.12)',
  borderBright: 'rgba(220,226,236,0.32)',
  text: '#e9ecf2',
  dim: '#8a94a8',
  accent: '#dce2ec',
  accent2: '#c2cbd8',
  warn: '#ffb84c',
  danger: '#ff5f63',
  mono: "'IBM Plex Mono', monospace",
  sans: "'Space Grotesk', sans-serif",
};

export function tokensForMode(mode: ThemeMode): CrucixTokens {
  return mode === 'light' ? LIGHT_TOKENS : DARK_TOKENS;
}
