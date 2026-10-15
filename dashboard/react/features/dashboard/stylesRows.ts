import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../theme';
import { SIGNAL_CLASSES } from './classesSignals';
import { hairline, hoverText } from './styleConsts';

export const ROW_STYLES = {
  siteRow: (theme) => ({
    p: '8px 2px',
    borderBottom: `1px solid ${hairline(theme)}`,
    fontSize: 13,
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    '&:last-child': { borderBottom: 0 },
  }),
  siteValue: (theme) => ({ fontFamily: FONT_MONO, color: theme.palette.crucix.text2, fontSize: 12.5 }),
  sectionHead: (theme) => ({
    fontFamily: FONT_SANS,
    fontSize: 10.5,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: theme.palette.crucix.dim2,
    p: '10px 10px 4px',
  }),
  hwRow: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    p: '8px 10px',
    borderRadius: '6px',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background .15s',
    '&:hover': { bgcolor: theme.palette.crucix.raised },
  }),
  hwMain: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 },
  hwTitle: { fontSize: 13, lineHeight: 1.35, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  hwSub: (theme) => ({
    fontSize: 11.5,
    color: theme.palette.crucix.dim2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  quakeRow: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    p: '7px 2px',
    borderBottom: `1px solid ${hairline(theme)}`,
    fontSize: 12.5,
    textDecoration: 'none',
    color: theme.palette.crucix.text2,
    [`&:hover .${SIGNAL_CLASSES.quakePlace}`]: { color: hoverText(theme) },
  }),
  quakeMag: {
    flex: 'none',
    fontFamily: FONT_MONO,
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid',
    borderRadius: '4px',
    p: '1px 6px',
    minWidth: 36,
    textAlign: 'center',
  },
  quakePlace: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  quakeMeta: (theme) => ({ fontFamily: FONT_MONO, fontSize: 10, color: theme.palette.crucix.dim3, whiteSpace: 'nowrap' }),
} satisfies Record<string, SxProps<Theme>>;

export function quakeMagSx(color: string): SxProps<Theme> {
  return [ROW_STYLES.quakeMag, { background: `${color}22`, color, borderColor: `${color}66` }];
}
