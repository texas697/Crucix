import type { SxProps, Theme } from '@mui/material/styles';
import { MARKDOWN_CLASSES } from '../../shared/markdown';
import { FONT_MONO, FONT_SANS } from '../../theme';

const PHONE = '@media (max-width:640px)';
const CTA_BORDER = 'rgba(220,226,236,0.4)';
const CTA_BG = 'rgba(220,226,236,0.05)';
const MARKDOWN_TEXT = `& .${MARKDOWN_CLASSES.paragraph}, & .${MARKDOWN_CLASSES.list}, & .${MARKDOWN_CLASSES.quote}`;

function softFill(theme: Theme, alpha: string): string {
  return theme.palette.mode === 'light' ? `rgba(16,24,40,${alpha})` : `rgba(255,255,255,${alpha})`;
}

export const BODY_STYLES = {
  body: (theme) => ({
    overflow: 'auto',
    p: '18px 22px 28px',
    fontSize: 14,
    lineHeight: 1.7,
    color: theme.palette.crucix.text,
    fontFamily: FONT_SANS,
    [PHONE]: { p: '16px' },
    '& h2': {
      fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
      color: theme.palette.crucix.accent, m: '20px 0 8px', pb: '5px', borderBottom: `1px solid ${theme.palette.crucix.border}`, lineHeight: 1.7,
    },
    '& h3': { fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, m: '16px 0 6px', color: theme.palette.crucix.text, lineHeight: 1.7 },
    '& h4': { fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, m: '16px 0 6px', color: theme.palette.crucix.text, lineHeight: 1.7 },
    [MARKDOWN_TEXT]: { fontFamily: FONT_SANS, fontSize: 14, lineHeight: 1.7 },
    '& p': { m: '0 0 10px' },
    '& ul, & ol': { m: '0 0 10px 20px', p: 0 },
    '& li': { m: '3px 0' },
    '& blockquote': { borderLeft: `2px solid ${theme.palette.crucix.accent}`, m: '8px 0', p: '4px 12px', color: theme.palette.crucix.sub },
    '& a': { color: theme.palette.crucix.accent },
    '& code': { fontFamily: FONT_MONO, fontSize: 12, bgcolor: softFill(theme, '0.06'), borderRadius: '4px', p: '1px 4px' },
    '& hr': { border: 0, borderTop: `1px solid ${theme.palette.crucix.border}`, m: '16px 0' },
  }),
  loading: {
    fontFamily: FONT_SANS,
    fontSize: 12,
    color: (theme) => theme.palette.crucix.dim,
    p: '30px',
    textAlign: 'center',
    letterSpacing: '0.02em',
  },
  note: { fontFamily: FONT_SANS, fontSize: 12, color: (theme) => theme.palette.crucix.dim, lineHeight: 1.55 },
  noteError: { color: (theme) => theme.palette.crucix.danger },
  topics: { display: 'flex', flexWrap: 'wrap', gap: '6px', m: '4px 0 12px' },
  topic: (theme) => ({
    fontFamily: FONT_SANS,
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'none',
    p: '4px 10px',
    border: `1px solid ${softFill(theme, theme.palette.mode === 'light' ? '0.12' : '0.08')}`,
    borderRadius: '5px',
    color: theme.palette.crucix.dim,
    bgcolor: 'transparent',
    cursor: 'pointer',
    lineHeight: 'normal',
    minWidth: 0,
    '&:hover': { borderColor: theme.palette.crucix.borderBright, color: theme.palette.crucix.text, bgcolor: 'transparent' },
  }),
  section: (theme) => ({ mt: '22px', pt: '16px', borderTop: `1px solid ${theme.palette.crucix.border}` }),
  progress: (theme) => ({
    height: 4,
    borderRadius: '4px',
    bgcolor: softFill(theme, '0.08'),
    m: '8px 0',
    overflow: 'hidden',
    '& .MuiLinearProgress-bar': {
      borderRadius: '4px',
      background: `linear-gradient(90deg, ${theme.palette.crucix.accentSecondary}, ${theme.palette.crucix.accent})`,
      transition: 'transform .4s',
    },
  }),
  cta: { p: '18px 14px', border: `1px dashed ${CTA_BORDER}`, borderRadius: '8px', bgcolor: CTA_BG, textAlign: 'center' },
  ctaText: { '&&': { fontFamily: FONT_SANS, fontSize: 12.5, color: (theme: Theme) => theme.palette.crucix.dim, m: '0 auto 10px', maxWidth: 460 } },
  ctaBig: {
    fontFamily: FONT_SANS,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: (theme) => theme.palette.crucix.accent,
    mb: '6px',
  },
} satisfies Record<string, SxProps<Theme>>;
