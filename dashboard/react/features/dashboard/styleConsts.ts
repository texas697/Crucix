import type { Theme } from '@mui/material/styles';

export const TABLET = '@media (max-width:1100px)';
export const PHONE = '@media (max-width:640px)';
export const LOW_PERF = 'body.low-perf &';

export const LOCAL_COLORS = {
  hairlineDark: 'rgba(255,255,255,0.04)',
  hairlineLight: 'rgba(16,24,40,0.08)',
  scrollThumbDark: '#1a2030',
  scrollThumbLight: '#c3ccd9',
  sourceDark: '#a2abbd',
  sourceLight: '#5b6b82',
  hoverTextDark: '#fff',
  hoverTextLight: '#0f172a',
  orange: '#ff8a5c',
  violet: '#c084fc',
  high: '#f59a5e',
  moderate: '#f2c879',
  ideaRisk: '#d9b88a',
  cardShadowLight: '0 1px 2px rgba(16,24,40,0.04)',
} as const;

export function isLight(theme: Theme): boolean {
  return theme.palette.mode === 'light';
}

export function hairline(theme: Theme): string {
  return isLight(theme) ? LOCAL_COLORS.hairlineLight : LOCAL_COLORS.hairlineDark;
}

export function scrollThumb(theme: Theme): string {
  return isLight(theme) ? LOCAL_COLORS.scrollThumbLight : LOCAL_COLORS.scrollThumbDark;
}

export function sourceColor(theme: Theme): string {
  return isLight(theme) ? LOCAL_COLORS.sourceLight : LOCAL_COLORS.sourceDark;
}

export function hoverText(theme: Theme): string {
  return isLight(theme) ? LOCAL_COLORS.hoverTextLight : LOCAL_COLORS.hoverTextDark;
}

export function accentGradient(theme: Theme): string {
  return `linear-gradient(90deg,${theme.palette.crucix.accentSecondary},${theme.palette.crucix.accent})`;
}
