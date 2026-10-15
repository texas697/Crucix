import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { LOW_PERF, isLight } from '../../styleConsts';

export const STYLES = {
  boot: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'background.default',
  },
  bootLogo: { width: 'min(560px, 90vw)' },
  bootLogoImg: { width: '100%', height: 'auto', display: 'block' },
  bootLogoDark: (theme) => ({ display: isLight(theme) ? 'none' : 'block' }),
  bootLogoLight: (theme) => ({ display: isLight(theme) ? 'block' : 'none' }),
  bootLines: (theme) => ({
    mt: '32px',
    fontFamily: FONT_MONO,
    fontSize: 12,
    color: theme.palette.crucix.dim,
    textAlign: 'left',
    lineHeight: 2,
    minWidth: 340,
  }),
  bootProgress: {
    width: 340,
    height: 2,
    mt: '20px',
    borderRadius: '2px',
    bgcolor: (theme) => theme.palette.crucix.raised,
    [LOW_PERF]: { display: 'none' },
  },
  bootFinal: {
    mt: '24px',
    fontFamily: FONT_MONO,
    fontSize: 14,
    fontWeight: 600,
    color: 'primary.main',
    letterSpacing: '0.15em',
  },
} satisfies Record<string, SxProps<Theme>>;
