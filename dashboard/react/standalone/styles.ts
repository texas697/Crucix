import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../theme';

const TABLET = '@media (max-width:1100px)';

const isLight = (theme: Theme) => theme.palette.mode === 'light';

export const STYLES = {
  surface: { minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' },
  mapWrap: { display: 'flex', flexDirection: 'column', width: '100%', mt: '8px' },
  mapContainer: (theme) => ({
    height: 560,
    border: '1px solid',
    borderColor: 'divider',
    borderTop: 0,
    borderRadius: '0 0 8px 8px',
    background: isLight(theme)
      ? 'radial-gradient(ellipse at center,#e9edf3,#dfe4ec)'
      : 'radial-gradient(ellipse at center,rgba(8,11,17,1),rgba(5,7,11,1))',
    position: 'relative',
    overflow: 'hidden',
    [TABLET]: { height: 420 },
  }),
  mapLoading: (theme) => ({
    position: 'absolute',
    inset: 0,
    zIndex: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isLight(theme)
      ? 'linear-gradient(180deg,rgba(238,241,246,0.85),rgba(238,241,246,0.95))'
      : 'linear-gradient(180deg,rgba(5,7,11,0.78),rgba(5,7,11,0.9))',
    backdropFilter: 'blur(10px)',
  }),
  mapLoadingText: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'primary.main',
  },
  mapControls: (theme) => ({
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    bgcolor: isLight(theme) ? 'rgba(255,255,255,0.92)' : 'rgba(10,13,20,0.9)',
    border: '1px solid',
    borderColor: isLight(theme) ? 'divider' : 'rgba(255,255,255,0.07)',
    borderRadius: '6px',
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
  }),
  mapControl: (theme) => ({
    width: 34,
    height: 34,
    border: 0,
    borderRadius: 0,
    boxShadow: 'none',
    bgcolor: 'transparent',
    color: theme.palette.crucix.text2,
    fontSize: 16,
    fontFamily: FONT_SANS,
    '&:hover': { bgcolor: theme.palette.crucix.raised, color: 'text.primary', border: 0 },
    '& + &': { borderTop: '1px solid', borderTopColor: 'divider' },
  }),
  mapControlOn: (theme) => ({ bgcolor: theme.palette.crucix.raised2, color: 'text.primary' }),
  main: {
    minHeight: '100vh',
    position: 'relative',
    p: '20px 24px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    [TABLET]: { p: '12px' },
  },
} satisfies Record<string, SxProps<Theme>>;
