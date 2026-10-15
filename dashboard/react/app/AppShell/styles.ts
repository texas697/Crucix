import { keyframes, type SxProps, type Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../theme';

const CONTROL_H = 34;
const TABLET = '@media (max-width:1100px)';
const NARROW = '@media (max-width:720px)';
const PHONE = '@media (max-width:640px)';
const LOW_PERF = 'body.low-perf &';

function livePulse(color: string) {
  return keyframes`
    0%, 100% { box-shadow: 0 0 0 0 ${color}; }
    50% { box-shadow: 0 0 0 5px ${color}; }
  `;
}

const byokPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(220,226,236,0.45); }
  70% { box-shadow: 0 0 0 10px rgba(220,226,236,0); }
  100% { box-shadow: 0 0 0 0 rgba(220,226,236,0); }
`;

export const STYLES = {
  root: { minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' },
  bar: { flex: 'none', zIndex: 'appBar' },
  navProgress: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, borderRadius: '0 0 8px 8px' },
  toolbar: {
    [TABLET]: { p: '10px 12px', gap: '10px' },
    [PHONE]: { gap: '10px 12px', p: '8px 10px' },
  },
  left: {
    alignItems: 'center',
    gap: '12px',
    flex: 'none',
    maxWidth: '100%',
    whiteSpace: 'nowrap',
    [TABLET]: { width: '100%' },
    [PHONE]: { flexWrap: 'wrap' },
  },
  brand: { display: 'flex', alignItems: 'center', gap: '12px', lineHeight: 1.15 },
  brandLogo: { height: 34, width: 'auto', display: 'block', flex: 'none' },
  nav: { flex: '0 1 auto', minWidth: 0, maxWidth: '100%' },
  spacer: { flex: 1, [TABLET]: { display: 'none' } },
  right: {
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    whiteSpace: 'nowrap',
    [TABLET]: { width: '100%', gap: '6px' },
    [PHONE]: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  },
  control: { height: CONTROL_H, minHeight: CONTROL_H, boxSizing: 'border-box', borderRadius: '9px' },
  iconControl: { width: CONTROL_H, height: CONTROL_H, borderRadius: '9px' },
  status: {
    display: 'inline-flex',
    alignItems: 'stretch',
    height: CONTROL_H,
    boxSizing: 'border-box',
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '9px',
    p: '2px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
    overflow: 'hidden',
    [NARROW]: { flexWrap: 'wrap' },
    [PHONE]: { flexWrap: 'nowrap' },
  },
  segment: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    px: '12px',
    py: 0,
    fontFamily: FONT_SANS,
    fontSize: 12.5,
    color: (theme) => theme.palette.crucix.dim,
    whiteSpace: 'nowrap',
    borderRadius: '8px',
    '& + &': { boxShadow: (theme) => `inset 1px 0 0 ${theme.palette.crucix.border}` },
    [NARROW]: { '& + &': { boxShadow: 'none' } },
    [PHONE]: { px: '9px', fontSize: 12 },
  },
  live: { color: 'text.primary' },
  dot: (theme) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    bgcolor: 'primary.main',
    animation: `${livePulse(theme.palette.crucix.accentSoft)} 2.2s ease-in-out infinite`,
    [LOW_PERF]: { animation: 'none' },
  }),
  sourcesOk: { color: 'text.primary', fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 600 },
  slash: { color: (theme) => theme.palette.crucix.dim3, mx: '1px' },
  model: { [NARROW]: { display: 'none' } },
  age: { fontFamily: FONT_MONO, fontSize: 12, [PHONE]: { display: 'none' } },
  keyPillValue: { color: 'primary.main', fontWeight: 500, ml: '6px' },
  keyCta: {
    fontWeight: 600,
    px: '14px',
    height: CONTROL_H,
    boxShadow: '0 0 0 0 rgba(220,226,236,0.6)',
    animation: `${byokPulse} 2.2s 4`,
    [LOW_PERF]: { animation: 'none' },
  },
  userChip: { gap: '8px', px: '6px', py: 0, height: CONTROL_H, borderRadius: '9px', fontSize: 13 },
  userChipExit: { color: 'primary.main', fontWeight: 500 },
  outlet: { minHeight: 0 },
} satisfies Record<string, SxProps<Theme>>;
