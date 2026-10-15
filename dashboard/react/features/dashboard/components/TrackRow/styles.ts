import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { hairline } from '../../styleConsts';

export const STYLES = {
  trackRow: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    p: '7px 2px',
    borderBottom: `1px solid ${hairline(theme)}`,
    fontSize: 12.5,
  }),
  trackType: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.05em',
    border: '1px solid',
    borderRadius: '4px',
    p: '1px 5px',
    flex: 'none',
  },
  trackLocation: (theme) => ({
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.palette.crucix.text2,
  }),
  trackMeta: { fontFamily: FONT_MONO, fontSize: 10, color: (theme) => theme.palette.crucix.dim3, whiteSpace: 'nowrap' },
  trackSourceLink: { color: 'primary.main', textDecoration: 'none' },
} satisfies Record<string, SxProps<Theme>>;

export function trackTypeSx(color: string): SxProps<Theme> {
  return [STYLES.trackType, { color, borderColor: `${color}66` }];
}
