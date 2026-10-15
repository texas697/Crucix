import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { hairline } from '../../styleConsts';

export const STYLES = {
  econRow: (theme) => ({
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    p: '8px 2px',
    borderBottom: `1px solid ${hairline(theme)}`,
    fontSize: 13,
    '&:last-child': { borderBottom: 0 },
  }),
  econLabel: { color: (theme) => theme.palette.crucix.text2 },
  econValue: { fontFamily: FONT_MONO, fontWeight: 400, fontSize: 12.5, color: 'text.primary' },
} satisfies Record<string, SxProps<Theme>>;
