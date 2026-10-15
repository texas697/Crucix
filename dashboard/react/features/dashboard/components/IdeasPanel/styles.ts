import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../../../theme';

export const STYLES = {
  ideasSource: { fontFamily: FONT_SANS, fontSize: 11.5, letterSpacing: 0, display: 'inline', ml: '6px', fontWeight: 400 },
  ideasSourceMine: { color: 'primary.main' },
  ideasSourceLlm: { color: (theme) => theme.palette.crucix.violet },
  ideasSourceStatic: { color: (theme) => theme.palette.crucix.dim },
  ideasList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  disclosure: (theme) => ({ m: '14px 2px 0', fontFamily: FONT_SANS, fontSize: 11.5, color: theme.palette.crucix.dim3, lineHeight: 1.55 }),
  ideasActions: { display: 'flex', gap: '6px', alignItems: 'center' },
  headActions: { ml: 'auto' },
  ideasMeta: { fontFamily: FONT_MONO, fontSize: 10, color: (theme) => theme.palette.crucix.dim, letterSpacing: '0.02em' },
  ideasGen: (theme) => ({
    p: '6px 12px',
    fontFamily: FONT_SANS,
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: 0,
    textTransform: 'none',
    border: '1px solid',
    borderColor: theme.palette.crucix.borderBright,
    borderRadius: '5px',
    bgcolor: theme.palette.crucix.raised,
    color: 'text.primary',
    transition: 'background .15s',
    '&:hover': { bgcolor: theme.palette.crucix.raised2, borderColor: theme.palette.crucix.borderBright, color: 'text.primary' },
    '&.Mui-disabled': { opacity: 0.5, cursor: 'wait', color: 'text.primary' },
  }),
} satisfies Record<string, SxProps<Theme>>;
