import type { SxProps, Theme } from '@mui/material/styles';
import { LOGIN_TOKENS } from '../../../theme/tokens';

const L = LOGIN_TOKENS;
const INPUT_BG = 'rgba(255,255,255,0.03)';
const GOOGLE_BG = 'rgba(255,255,255,0.04)';
const PRIMARY_BG = 'rgba(220,226,236,0.10)';
const PRIMARY_HOVER_BG = 'rgba(220,226,236,0.18)';
const BACKDROP =
  'radial-gradient(ellipse at 20% 10%,rgba(220,226,236,0.05),transparent 50%),'
  + 'radial-gradient(ellipse at 80% 90%,rgba(139,149,166,0.05),transparent 50%)';

const MONO_CAPS = {
  fontFamily: L.mono,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
} as const;

const WAIT_DISABLED = { opacity: 0.5, cursor: 'wait', pointerEvents: 'auto' } as const;

export const STYLES = {
  root: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: '24px 16px',
    color: L.text, fontFamily: L.sans, backgroundImage: BACKDROP,
  },
  card: {
    width: '100%', maxWidth: 400, bgcolor: L.panel, border: `1px solid ${L.border}`, borderRadius: 0,
    p: '28px 26px', backdropFilter: 'blur(10px)', color: L.text,
  },
  title: { fontFamily: L.sans, fontSize: 22, fontWeight: 600, lineHeight: 1.2, textAlign: 'center', m: '4px 0' },
  sub: { fontFamily: L.sans, fontSize: 12, color: L.dim, lineHeight: 1.5, mb: '18px', textAlign: 'center' },
  tabs: {
    minHeight: 0, p: 0, m: '0 0 16px', bgcolor: 'transparent', border: 'none', borderRadius: 0,
    '& .MuiTabs-flexContainer': { gap: '6px' },
  },
  tab: {
    ...MONO_CAPS, fontSize: 10, flex: 1, minHeight: 0, minWidth: 0, p: '8px', borderRadius: 0,
    bgcolor: 'transparent', border: `1px solid ${L.border}`, color: L.dim,
    '&:hover': { color: L.dim },
    '&.Mui-selected': { borderColor: L.borderBright, color: L.accent, bgcolor: 'transparent', boxShadow: 'none' },
  },
  google: {
    ...MONO_CAPS, width: '100%', p: '11px', borderRadius: 0, bgcolor: GOOGLE_BG, border: `1px solid ${L.border}`,
    color: L.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    '&:hover': { borderColor: L.borderBright, bgcolor: GOOGLE_BG, color: L.text },
    '&.Mui-disabled': { ...WAIT_DISABLED, color: L.text },
  },
  googleIcon: { width: 16, height: 16 },
  divider: {
    m: '16px 0 2px', fontFamily: L.mono, fontSize: 9, letterSpacing: '0.14em', color: L.dim,
    '&::before, &::after': { borderColor: L.border },
    '& .MuiDivider-wrapper': { px: '10px' },
  },
  form: { display: 'flex', flexDirection: 'column' },
  field: {
    mt: '12px',
    '& .MuiInputLabel-root': {
      position: 'static', transform: 'none', fontFamily: L.mono, fontSize: 10, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: L.dim, mb: '5px',
      '&.Mui-focused, &.Mui-disabled': { color: L.dim },
    },
    '& .MuiOutlinedInput-root': {
      bgcolor: INPUT_BG, borderRadius: 0, fontFamily: L.mono, fontSize: 13, color: L.text,
      '& .MuiOutlinedInput-notchedOutline': { top: 0, borderColor: L.border },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: L.border },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: L.borderBright, borderWidth: 1 },
    },
    '& .MuiOutlinedInput-notchedOutline legend': { display: 'none' },
    '& .MuiOutlinedInput-input': { p: '10px 11px', height: 'auto' },
  },
  submit: {
    ...MONO_CAPS, width: '100%', mt: '18px', p: '12px', borderRadius: 0, bgcolor: PRIMARY_BG,
    border: `1px solid ${L.borderBright}`, color: L.accent,
    '&:hover': { bgcolor: PRIMARY_HOVER_BG, borderColor: L.borderBright, color: L.accent },
    '&.Mui-disabled': { ...WAIT_DISABLED, color: L.accent },
  },
  message: { mt: '14px', fontFamily: L.mono, fontSize: 11, lineHeight: 1.5, minHeight: 16 },
  messageOk: { color: L.accent },
  alert: {
    mt: '14px', p: 0, bgcolor: 'transparent', border: 'none', borderRadius: 0, color: L.danger,
    fontFamily: L.mono, fontSize: 11, lineHeight: 1.5, minHeight: 16,
    '& .MuiAlert-message': { p: 0 },
  },
  foot: {
    mt: '22px', fontFamily: L.sans, fontSize: 10, color: L.dim, lineHeight: 1.5,
    borderTop: `1px solid ${L.border}`, pt: '12px',
  },
} satisfies Record<string, SxProps<Theme>>;
