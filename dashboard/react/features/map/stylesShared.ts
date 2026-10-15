import { keyframes, type SxProps, type Theme } from '@mui/material/styles';

export type SxMap = Record<string, SxProps<Theme>>;
export const TABLET = '@media (max-width:1100px)';
export const PHONE = '@media (max-width:640px)';
export const LOW_PERF = 'body.low-perf &';
export const DARK_GLASS = 'rgba(7,9,14,0.85)';
export const DARK_CONTROLS = 'rgba(10,13,20,0.9)';
export const LIGHT_GLASS = 'rgba(255,255,255,0.92)';
export const FOCUS_BORDER = 'rgba(220,226,236,0.4)';
export const isLight = (theme: Theme): boolean => theme.palette.mode === 'light';

export const spin = keyframes`to { transform: rotate(360deg); }`;
export const briefShimmer = keyframes`0% { background-position: 200% 0; } 100% { background-position: -200% 0; }`;
export const briefPulse = keyframes`0%, 100% { opacity: 0.25; } 50% { opacity: 1; }`;
