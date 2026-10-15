import type { SxProps, Theme } from '@mui/material/styles';

export const PHONE = '@media (max-width:640px)';
export const VIOLET = '#c3a6ff';
export const VIOLET_BORDER = 'rgba(180,140,255,0.4)';
export const VIOLET_SOFT = 'rgba(180,140,255,0.12)';
export const SKY_BORDER = 'rgba(143,184,216,0.3)';
export const VOTED_BORDER = 'rgba(220,226,236,0.4)';
const HERO_GLOW = 'radial-gradient(1200px 600px at 50% -200px,rgba(220,226,236,0.06),transparent 70%)';

export const STYLES = {
  root: (theme) => ({
    p: '20px 24px 40px',
    backgroundImage: theme.palette.mode === 'light' ? 'none' : HERO_GLOW,
    [PHONE]: { p: '12px' },
  }),
} satisfies Record<string, SxProps<Theme>>;
