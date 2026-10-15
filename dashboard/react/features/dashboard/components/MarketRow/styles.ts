import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { MARKET_CLASSES } from '../../classesMarkets';
import { accentGradient, hairline, hoverText } from '../../styleConsts';

export const STYLES = {
  marketItem: (theme) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    p: '9px 2px',
    borderBottom: `1px solid ${hairline(theme)}`,
    textDecoration: 'none',
    color: 'text.primary',
    [`&:hover .${MARKET_CLASSES.marketQuestion}`]: { color: hoverText(theme) },
  }),
  marketQuestion: { fontSize: 12.5, lineHeight: 1.4, color: (theme) => theme.palette.crucix.text2 },
  marketBar: (theme) => ({ height: 5, borderRadius: '4px', bgcolor: theme.palette.crucix.raised, overflow: 'hidden' }),
  marketBarFill: (theme) => ({ display: 'block', height: '100%', borderRadius: '4px', background: accentGradient(theme) }),
  marketMeta: { fontFamily: FONT_MONO, fontSize: 10.5, color: (theme) => theme.palette.crucix.dim },
  marketPct: { color: 'primary.main' },
} satisfies Record<string, SxProps<Theme>>;

export function marketFillSx(percent: number): SxProps<Theme> {
  return [STYLES.marketBarFill, { width: `${percent}%` }];
}
