import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_SANS } from '../../../../theme';

export const STYLES = {
  empty: {
    gridColumn: '1 / -1',
    p: '48px',
    textAlign: 'center',
    whiteSpace: 'pre-line',
    color: (theme) => theme.palette.crucix.dim,
    fontFamily: FONT_SANS,
    fontSize: 12.5,
    border: '1px dashed',
    borderColor: 'divider',
    borderRadius: '8px',
  },
} satisfies Record<string, SxProps<Theme>>;
