import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../theme';
import { CLASSES } from './classes';
import { LOW_PERF, isLight, type SxMap } from './stylesShared';

const ELLIPSIS = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

export const PANEL_STYLES = {
  panel: (theme) => ({
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 8,
    width: 300,
    maxWidth: 'calc(100% - 28px)',
    maxHeight: 'calc(100% - 90px)',
    display: 'flex',
    flexDirection: 'column',
    bgcolor: isLight(theme) ? 'rgba(255,255,255,0.97)' : 'rgba(8,11,17,0.94)',
    backgroundImage: 'none',
    border: '1px solid',
    borderColor: theme.palette.crucix.borderBright,
    borderRadius: '8px',
    backdropFilter: 'blur(12px)',
    boxShadow: isLight(theme) ? '0 12px 36px rgba(16,24,40,0.18)' : '0 12px 36px rgba(0,0,0,0.4)',
    overflow: 'hidden',
    [LOW_PERF]: { backdropFilter: 'none' },
    [`&.${CLASSES.panelHasBrief}`]: { width: 380 },
  }),
  panelHead: { display: 'flex', alignItems: 'center', gap: '8px', p: '11px 12px', borderBottom: '1px solid', borderColor: 'divider', flex: 'none' },
  panelTitle: { fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600, color: 'text.primary' },
  panelCount: (theme) => ({ fontFamily: FONT_MONO, fontSize: 12, color: 'primary.main', bgcolor: theme.palette.crucix.accentSoft, p: '1px 8px', borderRadius: '20px' }),
  panelClear: (theme) => ({
    ml: 'auto',
    fontFamily: FONT_SANS,
    fontSize: 11.5,
    fontWeight: 400,
    p: '4px 10px',
    border: '1px solid',
    borderColor: theme.palette.crucix.border,
    borderRadius: '5px',
    bgcolor: 'transparent',
    color: theme.palette.crucix.dim,
    minWidth: 0,
    lineHeight: 'normal',
    '&:hover': { borderColor: theme.palette.crucix.borderBright, color: 'text.primary', bgcolor: 'transparent' },
  }),
  panelBody: { overflowY: 'auto', p: '10px 12px 12px' },
  panelDivider: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: FONT_MONO,
    fontSize: 9.5,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: theme.palette.crucix.dim2,
    m: '2px 0 8px',
    '&::after': { content: '""', flex: 1, height: '1px', bgcolor: 'divider' },
  }),
  panelSummary: (theme) => ({ fontFamily: FONT_SANS, fontSize: 11.5, color: theme.palette.crucix.dim, mb: '8px' }),
  panelGroup: { mb: '10px' },
  panelGroupHead: (theme) => ({ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color: theme.palette.crucix.text2, mb: '4px' }),
  panelDot: { width: 8, height: 8, borderRadius: '50%', flex: 'none' },
  panelGroupCount: (theme) => ({ ml: 'auto', fontFamily: FONT_MONO, fontSize: 11, color: theme.palette.crucix.dim }),
  panelItem: (theme) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '1px',
    width: '100%',
    textAlign: 'left',
    p: '6px 8px',
    border: 0,
    borderRadius: '5px',
    bgcolor: 'transparent',
    cursor: 'pointer',
    '&:hover': { bgcolor: theme.palette.crucix.raised },
  }),
  panelItemName: { fontFamily: FONT_SANS, fontSize: 12, color: 'text.primary', ...ELLIPSIS },
  panelItemMeta: (theme) => ({ fontFamily: FONT_MONO, fontSize: 10.5, color: theme.palette.crucix.dim, ...ELLIPSIS }),
  panelMore: (theme) => ({ fontFamily: FONT_MONO, fontSize: 10.5, color: theme.palette.crucix.dim, p: '3px 8px' }),
} satisfies SxMap;

export function panelDotSx(color: string): SxProps<Theme> {
  return [PANEL_STYLES.panelDot, { background: color }];
}
