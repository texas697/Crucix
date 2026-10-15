import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { hairline } from '../../styleConsts';

export const STYLES = {
  alertRow: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    p: '7px 2px',
    borderBottom: `1px solid ${hairline(theme)}`,
    fontSize: 12.5,
  }),
  alertTime: { fontFamily: FONT_MONO, fontSize: 10.5, color: (theme) => theme.palette.crucix.danger, minWidth: 64 },
  alertCities: { flex: 1, color: (theme) => theme.palette.crucix.text2 },
  alertDrill: (theme) => ({ fontSize: 9.5, color: theme.palette.crucix.dim, border: '1px solid', borderColor: 'divider', borderRadius: '4px', p: '1px 5px' }),
} satisfies Record<string, SxProps<Theme>>;
