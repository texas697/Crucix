import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../../../theme';
import { isLight } from '../../styleConsts';

export const STYLES = {
  ideasEmpty: (theme) => ({ p: '24px', textAlign: 'center', color: theme.palette.crucix.dim, fontFamily: FONT_SANS, fontSize: 12 }),
  ideasEmptyIcon: { fontSize: 24, mb: '8px', opacity: 0.3 },
  ideasEmptySub: { fontSize: 11, mt: '6px', opacity: 0.6 },
  ideasEmptyAction: { mt: '12px' },
  byokEmpty: (theme) => ({
    p: '24px 14px',
    textAlign: 'center',
    border: '1px dashed',
    borderColor: isLight(theme) ? 'rgba(30,41,59,0.3)' : 'rgba(220,226,236,0.35)',
    borderRadius: '8px',
    bgcolor: isLight(theme) ? 'rgba(30,41,59,0.06)' : 'rgba(220,226,236,0.04)',
  }),
  byokBig: { fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, letterSpacing: '0.02em', color: 'primary.main', mb: '6px' },
  byokWhy: { fontSize: 12.5, color: 'text.primary', opacity: 0.85, lineHeight: 1.5, maxWidth: 340, m: '0 auto 12px' },
  byokGen: (theme) => ({
    fontSize: 12.5,
    p: '8px 16px',
    bgcolor: 'primary.main',
    color: theme.palette.crucix.onAccent,
    borderColor: 'primary.main',
    fontWeight: 600,
    '&:hover': { bgcolor: 'primary.main', color: theme.palette.crucix.onAccent, borderColor: 'primary.main' },
  }),
  byokProviders: { fontFamily: FONT_MONO, fontSize: 9, color: (theme) => theme.palette.crucix.dim, mt: '10px', letterSpacing: '0.06em' },
} satisfies Record<string, SxProps<Theme>>;
