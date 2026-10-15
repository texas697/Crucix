import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_SANS } from '../../../../theme';
import { isLight } from '../../styleConsts';

function anomBackground(theme: Theme): string {
  return isLight(theme) ? 'rgba(138,90,18,0.08)' : 'rgba(233,170,90,0.07)';
}

export const STYLES = {
  banner: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    p: '10px 12px',
    borderRadius: '6px',
    bgcolor: anomBackground(theme),
    color: theme.palette.crucix.warn,
    fontFamily: FONT_SANS,
    fontSize: 12.5,
    letterSpacing: 0,
    textTransform: 'none',
    mb: '8px',
  }),
  ok: (theme) => ({ bgcolor: 'rgba(90,210,160,0.08)', color: theme.palette.crucix.mint }),
  anom: (theme) => ({ bgcolor: anomBackground(theme), color: theme.palette.crucix.warn }),
  note: { ml: 'auto', fontSize: 11, opacity: 0.75 },
} satisfies Record<string, SxProps<Theme>>;
