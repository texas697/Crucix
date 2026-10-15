import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_SANS } from '../../../../theme';
import { LOCAL_COLORS } from '../../styleConsts';

export const STYLES = {
  hwList: { display: 'flex', flexDirection: 'column' },
  hwEmpty: (theme) => ({ p: '16px 10px', color: theme.palette.crucix.dim, fontFamily: FONT_SANS, fontSize: 12 }),
} satisfies Record<string, SxProps<Theme>>;

export const RISK_STYLES: Record<string, SxProps<Theme>> = {
  'very high': { color: (theme) => theme.palette.crucix.danger },
  high: { color: LOCAL_COLORS.high },
  moderate: { color: LOCAL_COLORS.moderate },
  low: { color: (theme) => theme.palette.crucix.mint },
};
