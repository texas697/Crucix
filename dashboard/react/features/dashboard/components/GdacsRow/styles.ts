import type { SxProps, Theme } from '@mui/material/styles';
import { LOCAL_COLORS } from '../../styleConsts';

export const STYLES = {
  magRed: (theme) => ({ bgcolor: 'rgba(255,107,116,0.14)', color: theme.palette.crucix.danger, borderColor: 'rgba(255,107,116,0.4)' }),
  magOrange: { bgcolor: 'rgba(255,138,92,0.14)', color: LOCAL_COLORS.orange, borderColor: 'rgba(255,138,92,0.4)' },
} satisfies Record<string, SxProps<Theme>>;
