import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../../../theme';

export type DeltaKind = 'new' | 'escalated' | 'deescalated';

export const STYLES = {
  deltaRow: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    p: '7px 2px',
    fontFamily: FONT_SANS,
    fontSize: 13,
    color: theme.palette.crucix.text2,
  }),
  deltaDot: { width: 6, height: 6, borderRadius: '50%', flex: 'none' },
  deltaLabel: (theme) => ({ flex: 1, color: theme.palette.crucix.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
  deltaValue: (theme) => ({ color: theme.palette.crucix.dim, fontSize: 11, whiteSpace: 'nowrap', fontFamily: FONT_MONO }),
} satisfies Record<string, SxProps<Theme>>;

export const DOT_STYLES: Record<DeltaKind, SxProps<Theme>> = {
  new: { bgcolor: 'primary.main' },
  escalated: { bgcolor: (theme) => theme.palette.crucix.mint },
  deescalated: { bgcolor: (theme) => theme.palette.crucix.danger },
};
