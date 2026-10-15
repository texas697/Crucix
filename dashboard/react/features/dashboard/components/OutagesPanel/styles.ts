import type { SxProps, Theme } from '@mui/material/styles';
import { LOCAL_COLORS } from '../../styleConsts';

export const STYLES = {
  nationalBanner: { color: LOCAL_COLORS.violet, bgcolor: 'rgba(192,132,252,0.08)' },
} satisfies Record<string, SxProps<Theme>>;
