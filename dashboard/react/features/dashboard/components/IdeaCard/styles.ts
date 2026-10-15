import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../../../theme';
import { LOCAL_COLORS } from '../../styleConsts';

export const STYLES = {
  ideaCard: (theme) => ({
    p: '14px 16px',
    border: `1px solid ${LOCAL_COLORS.hairlineDark}`,
    borderRadius: '6px',
    bgcolor: theme.palette.crucix.panel2,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }),
  ideaMeta: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: 12, color: (theme) => theme.palette.crucix.dim },
  ideaType: {
    fontFamily: FONT_SANS,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    p: '3px 8px',
    borderRadius: '6px',
    display: 'inline-block',
  },
  ideaTicker: { fontFamily: FONT_MONO, color: 'text.primary' },
  ideaHorizon: { fontFamily: FONT_SANS, fontSize: 12, letterSpacing: 0, textTransform: 'none', color: (theme) => theme.palette.crucix.dim },
  ideaConfidence: { fontFamily: FONT_SANS, fontSize: 12, color: (theme) => theme.palette.crucix.dim },
  ideaTitle: { fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em', m: 0, color: 'text.primary' },
  ideaText: { fontSize: 13, lineHeight: 1.55, color: 'text.secondary' },
  ideaRisk: { fontSize: 12.5, color: LOCAL_COLORS.ideaRisk },
} satisfies Record<string, SxProps<Theme>>;

export const IDEA_TYPE_STYLES: Record<string, SxProps<Theme>> = {
  long: { color: (theme) => theme.palette.crucix.mint, bgcolor: 'rgba(90,210,160,0.12)' },
  short: { color: (theme) => theme.palette.crucix.danger, bgcolor: 'rgba(240,90,80,0.12)' },
  hedge: { color: (theme) => theme.palette.crucix.warn, bgcolor: 'rgba(233,170,90,0.12)' },
  watch: { color: (theme) => theme.palette.crucix.sky, bgcolor: 'rgba(220,226,236,0.1)' },
  avoid: { color: (theme) => theme.palette.crucix.text2, bgcolor: 'rgba(255,255,255,0.05)' },
};
