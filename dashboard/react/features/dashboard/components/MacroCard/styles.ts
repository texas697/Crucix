import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../../../theme';
import { accentGradient, isLight } from '../../styleConsts';

export const STYLES = {
  macroCard: (theme) => ({ p: '10px', border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: theme.palette.crucix.panel2 }),
  macroLabel: { fontFamily: FONT_SANS, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: (theme) => theme.palette.crucix.dim },
  macroValue: { fontFamily: FONT_MONO, fontSize: 18, fontWeight: 500, mt: '6px', display: 'block' },
  macroSub: { fontFamily: FONT_MONO, fontSize: 10, color: (theme) => theme.palette.crucix.dim, mt: '4px', display: 'block' },
  macroBar: (theme) => ({
    height: 3,
    mt: '8px',
    bgcolor: isLight(theme) ? 'rgba(16,24,40,0.08)' : 'rgba(255,255,255,0.06)',
    borderRadius: '1px',
    overflow: 'hidden',
  }),
  macroBarFill: (theme) => ({ display: 'block', height: '100%', borderRadius: '1px', background: accentGradient(theme) }),
} satisfies Record<string, SxProps<Theme>>;

export function macroFillSx(percent: number): SxProps<Theme> {
  return [STYLES.macroBarFill, { width: `${percent}%` }];
}
