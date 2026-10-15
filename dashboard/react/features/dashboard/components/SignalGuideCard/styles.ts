import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../../../theme';

export const STYLES = {
  card: (theme) => ({ p: '12px', borderRadius: '6px', bgcolor: theme.palette.crucix.panel2 }),
  term: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', mb: '7px' },
  termName: { fontFamily: FONT_SANS, fontSize: 12, letterSpacing: '0.02em', textTransform: 'uppercase' },
  tag: (theme) => ({
    fontFamily: FONT_MONO,
    fontSize: 9,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    p: '2px 6px',
    border: '1px solid rgba(220,226,236,0.2)',
    borderRadius: '5px',
    color: 'primary.main',
    bgcolor: theme.palette.crucix.accentSoft,
  }),
  line: (theme) => ({ fontSize: 12, lineHeight: 1.5, color: theme.palette.crucix.text2, '& + &': { mt: '5px' } }),
  label: (theme) => ({ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.palette.crucix.dim, mr: '6px' }),
} satisfies Record<string, SxProps<Theme>>;
