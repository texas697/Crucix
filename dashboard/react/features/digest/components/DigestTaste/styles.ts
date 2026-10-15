import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_SANS } from '../../../../theme';

export const STYLES = {
  taste: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
    fontFamily: FONT_SANS,
    fontSize: 12,
    color: (theme) => theme.palette.crucix.dim,
    mb: '12px',
  },
  tasteLike: { color: 'primary.main' },
  tasteDislike: { color: (theme) => theme.palette.crucix.danger },
} satisfies Record<string, SxProps<Theme>>;
