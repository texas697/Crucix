import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../theme';
import { LOW_PERF, isLight, type SxMap } from './stylesShared';

export const POPUP_STYLES = {
  popup: (theme) => ({
    position: 'absolute',
    zIndex: 20,
    width: 280,
    p: '12px',
    bgcolor: isLight(theme) ? 'rgba(255,255,255,0.98)' : 'rgba(6,10,14,0.95)',
    border: '1px solid',
    borderColor: isLight(theme) ? 'rgba(30,41,59,0.3)' : 'rgba(220,226,236,0.25)',
    borderRadius: '6px',
    backdropFilter: 'blur(12px)',
    boxShadow: isLight(theme) ? '0 10px 34px rgba(16,24,40,0.18)' : '0 8px 32px rgba(0,0,0,0.5)',
    pointerEvents: 'auto',
    backgroundImage: 'none',
    [LOW_PERF]: { backdropFilter: 'none' },
  }),
  popupClose: (theme) => ({
    position: 'absolute',
    top: 6,
    right: 8,
    width: 'auto',
    height: 'auto',
    p: 0,
    bgcolor: 'transparent',
    border: 0,
    borderRadius: 0,
    boxShadow: 'none',
    color: theme.palette.crucix.dim,
    fontSize: 14,
    '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
  }),
  popupHead: { fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600, color: 'primary.main', letterSpacing: '0.04em', textTransform: 'uppercase', mb: '4px' },
  popupText: (theme) => ({ fontSize: 12, lineHeight: 1.45, color: theme.palette.crucix.text2 }),
  popupMeta: (theme) => ({ fontFamily: FONT_MONO, fontSize: 10, color: theme.palette.crucix.dim, mt: '6px' }),
  popupFoot: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    mt: '8px',
    pt: '8px',
    borderTop: '1px solid',
    borderTopColor: isLight(theme) ? 'rgba(16,24,40,0.08)' : 'rgba(255,255,255,0.06)',
  }),
  popupCopy: (theme) => ({
    fontFamily: FONT_MONO,
    fontSize: 10,
    color: theme.palette.crucix.dim,
    bgcolor: 'transparent',
    border: '1px solid',
    borderColor: theme.palette.crucix.border,
    borderRadius: '4px',
    p: '2px 6px',
    minWidth: 0,
    lineHeight: 'normal',
    '&:hover': { color: 'text.primary', borderColor: theme.palette.crucix.borderBright, bgcolor: 'transparent' },
  }),
  popupLink: { fontSize: 11.5, color: 'primary.main' },
  popupNew: { fontSize: 10.5, color: 'primary.main', ml: 'auto' },
} satisfies SxMap;

export function popupAt(left: number, top: number): SxProps<Theme> {
  return [POPUP_STYLES.popup, { left: `${left}%`, top: `${top}%` }];
}
