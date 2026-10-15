import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_SANS } from '../../../../theme';
import { LOCAL_COLORS, hairline, isLight, scrollThumb } from '../../styleConsts';

export const STYLES = {
  card: (theme) => ({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
    boxShadow: isLight(theme) ? LOCAL_COLORS.cardShadowLight : 'none',
  }),
  cardHead: (theme) => ({
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    p: '16px 18px 12px',
    borderBottom: `1px solid ${hairline(theme)}`,
  }),
  cardTitle: { fontSize: 13, fontWeight: 500, lineHeight: 'normal', color: 'text.primary', whiteSpace: 'nowrap' },
  cardHeadRight: { ml: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  badge: (theme) => ({
    fontFamily: FONT_SANS,
    fontSize: 11.5,
    color: theme.palette.crucix.dim,
    letterSpacing: 0,
    textTransform: 'none',
    whiteSpace: 'nowrap',
  }),
  badgeUp: { color: (theme) => theme.palette.crucix.warn },
  badgeDown: { color: (theme) => theme.palette.crucix.danger },
  cardBody: (theme) => ({
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    p: '12px 18px 16px',
    '&::-webkit-scrollbar': { width: 6 },
    '&::-webkit-scrollbar-thumb': { background: scrollThumb(theme), borderRadius: '5px' },
  }),
  cardBodyPadSm: { p: '6px 8px 8px' },
} satisfies Record<string, SxProps<Theme>>;

export function cardSx(flex: string | undefined): SxProps<Theme> {
  return flex ? [STYLES.card, { flex }] : STYLES.card;
}
