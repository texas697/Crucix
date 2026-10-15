import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../../theme';

const TABLET = '@media (max-width:1100px)';

export const STYLES = {
  panel: (theme) => ({
    position: 'absolute',
    top: 18,
    right: 18,
    m: 0,
    width: 'min(420px, calc(100vw - 32px))',
    maxWidth: 'none',
    maxHeight: 'calc(100vh - 36px)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.98)' : 'rgba(10,13,20,0.96)',
    boxShadow: theme.palette.mode === 'light' ? '0 18px 48px rgba(16,24,40,0.2)' : '0 18px 48px rgba(0,0,0,0.45)',
    [TABLET]: {
      top: 'auto', right: 0, left: 0, bottom: 0, width: '100%', maxHeight: 'min(72vh, 720px)',
      borderRadius: '8px 8px 0 0', borderBottom: 'none',
    },
  }),
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', p: '14px 16px 10px', borderBottom: '1px solid', borderColor: 'divider' },
  kicker: { fontFamily: FONT_SANS, fontSize: 11, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'primary.main', mb: '5px' },
  title: { fontSize: 18, fontWeight: 600, lineHeight: 1.15 },
  sub: { fontSize: 12, lineHeight: 1.45, color: (theme) => theme.palette.crucix.dim, mt: '6px' },
  close: { width: 30, height: 30, borderRadius: '6px', fontSize: 18, bgcolor: (theme) => theme.palette.crucix.raised, color: (theme) => theme.palette.crucix.dim, flexShrink: 0 },
  body: { overflow: 'auto', p: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  form: { display: 'flex', flexDirection: 'column' },
  field: {
    mb: '10px',
    '& .MuiInputLabel-root': {
      position: 'static', transform: 'none', fontFamily: FONT_SANS, fontSize: 11, letterSpacing: '0.02em',
      textTransform: 'uppercase', color: (theme) => theme.palette.crucix.dim, mb: '4px',
    },
    '& .MuiOutlinedInput-root': { bgcolor: (theme) => theme.palette.crucix.panel2, fontFamily: FONT_MONO, fontSize: 12 },
    '& .MuiOutlinedInput-notchedOutline': { top: 0 },
    '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
    '& .MuiOutlinedInput-input, & .MuiNativeSelect-select': { p: '8px 10px' },
    '& .MuiFormHelperText-root': { m: '4px 0 0', fontSize: 10, lineHeight: 1.4, color: (theme) => theme.palette.crucix.dim },
  },
  fieldOptional: { textTransform: 'none', letterSpacing: 0 },
  autoIdeas: { m: '8px 0 4px', gap: '8px', '& .MuiFormControlLabel-label': { fontSize: 12, color: 'text.primary' } },
  autoIdeasCheckbox: { p: 0, color: (theme) => theme.palette.crucix.dim },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap', mt: '12px' },
  actionButton: { p: '8px 12px', fontSize: 12, bgcolor: (theme) => theme.palette.crucix.raised, color: (theme) => theme.palette.crucix.dim, '&.Mui-disabled': { opacity: 0.5 } },
  save: { color: 'primary.main', borderColor: 'rgba(220,226,236,0.35)', bgcolor: (theme) => theme.palette.crucix.accentSoft },
  remove: { color: (theme) => theme.palette.crucix.danger, borderColor: 'rgba(240,90,80,0.35)' },
  message: { fontFamily: FONT_MONO, fontSize: 10, lineHeight: 1.5, mt: '10px', minHeight: 14 },
  messageOk: { color: 'primary.main' },
  messageErr: { color: (theme) => theme.palette.crucix.danger },
  foot: { p: '10px 16px 14px', borderTop: '1px solid', borderColor: 'divider', fontFamily: FONT_MONO, fontSize: 9, lineHeight: 1.5, color: (theme) => theme.palette.crucix.dim3 },
} satisfies Record<string, SxProps<Theme>>;
