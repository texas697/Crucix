import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { LOCAL_COLORS, hairline } from '../../styleConsts';

export const STYLES = {
  threatRow: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    p: '8px 2px',
    borderBottom: `1px solid ${hairline(theme)}`,
    fontSize: 13,
    '&:hover': { bgcolor: theme.palette.crucix.raised, borderRadius: '5px' },
  }),
  threatDot: { width: 8, height: 8, borderRadius: '50%', flex: 'none' },
  threatName: { flex: 1, color: (theme) => theme.palette.crucix.text2, whiteSpace: 'nowrap' },
  threatMeta: { fontFamily: FONT_MONO, fontSize: 10.5, color: (theme) => theme.palette.crucix.dim3, whiteSpace: 'nowrap' },
  threatDisruption: { ml: '6px', p: '1px 5px', borderRadius: '4px', bgcolor: 'rgba(245,154,94,0.14)', color: LOCAL_COLORS.high },
  threatLevel: { fontSize: 11.5, fontWeight: 600, minWidth: 84, textAlign: 'right', whiteSpace: 'nowrap' },
  threatScore: { opacity: 0.55, fontWeight: 400 },
} satisfies Record<string, SxProps<Theme>>;

export function threatDotSx(color: string): SxProps<Theme> {
  return [STYLES.threatDot, { background: color }];
}

export function threatLevelSx(color: string): SxProps<Theme> {
  return [STYLES.threatLevel, { color }];
}
