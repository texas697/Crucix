import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { LOCAL_COLORS } from '../../styleConsts';

export const STYLES = {
  hwLevel: (theme) => ({
    fontFamily: FONT_MONO,
    fontSize: 11,
    p: '2px 7px',
    borderRadius: '5px',
    bgcolor: 'rgba(127,224,192,0.12)',
    color: theme.palette.crucix.mint,
    whiteSpace: 'nowrap',
  }),
} satisfies Record<string, SxProps<Theme>>;

export const HW_LEVEL_STYLES: Record<string, SxProps<Theme>> = {
  3: { bgcolor: 'rgba(245,154,94,0.14)', color: LOCAL_COLORS.high },
  4: { bgcolor: 'rgba(255,107,116,0.14)', color: (theme) => theme.palette.crucix.danger },
};
