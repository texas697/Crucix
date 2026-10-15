import { keyframes, type SxProps, type Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../theme';

const NARROW = '@media (max-width:900px)';
const STAGE_BG = '#000';
const HERO_GLOW = 'radial-gradient(1200px 600px at 50% -200px,rgba(220,226,236,0.06),transparent 70%)';
const OVERLAY_BG_DARK = 'rgba(5,7,11,0.86)';
const OVERLAY_BG_LIGHT = 'rgba(238,241,246,0.9)';
const SPINNER_TRACK = 'rgba(220,226,236,0.2)';
const LIVE_BORDER = 'rgba(240,90,80,0.3)';
const LIVE_BG = 'rgba(240,90,80,0.08)';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

function isLight(theme: Theme): boolean {
  return theme.palette.mode === 'light';
}

export const STYLES = {
  root: (theme) => ({ p: '20px 24px 40px', backgroundImage: isLight(theme) ? 'none' : HERO_GLOW }),
  hero: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', m: '22px 0 16px' },
  heroLead: { fontSize: 14.5, color: 'text.secondary', maxWidth: 680, lineHeight: 1.55, mt: '8px' },
  status: { fontFamily: FONT_MONO, fontSize: 12, color: (theme) => theme.palette.crucix.dim2 },
  layout: {
    display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', gap: '16px', alignItems: 'start',
    [NARROW]: { gridTemplateColumns: '1fr' },
  },
  channels: {
    bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: '10px',
    display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto',
    [NARROW]: { maxHeight: 'none', flexDirection: 'row', flexWrap: 'wrap' },
  },
  channelItem: { [NARROW]: { width: 'auto' } },
  channel: (theme) => ({
    display: 'flex', alignItems: 'center', gap: '10px', p: '10px', borderRadius: '6px', border: '1px solid transparent',
    textAlign: 'left', width: '100%', color: 'text.primary', fontFamily: FONT_SANS,
    '&:hover': { bgcolor: theme.palette.crucix.raised },
    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: theme.palette.crucix.raised2, borderColor: theme.palette.crucix.borderBright },
  }),
  channelDot: { width: 8, height: 8, borderRadius: '50%', flex: 'none' },
  channelText: { display: 'flex', flexDirection: 'column' },
  channelName: { fontSize: 13.5, fontWeight: 500, lineHeight: 'normal' },
  channelRegion: { fontSize: 11.5, lineHeight: 'normal', color: (theme) => theme.palette.crucix.dim2 },
  stage: {
    bgcolor: STAGE_BG, border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden',
    position: 'relative', aspectRatio: '16/9', width: '100%',
  },
  video: { width: '100%', height: '100%', bgcolor: STAGE_BG, display: 'block', objectFit: 'contain' },
  videoHidden: { display: 'none' },
  frame: { width: '100%', height: '100%', border: 0, bgcolor: STAGE_BG },
  overlay: (theme) => ({
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '12px', bgcolor: isLight(theme) ? OVERLAY_BG_LIGHT : OVERLAY_BG_DARK, textAlign: 'center', p: '20px',
  }),
  overlayTitle: { fontSize: 15, fontWeight: 600, lineHeight: 'normal' },
  overlaySub: { fontSize: 13, lineHeight: 'normal', color: 'text.secondary', maxWidth: 420 },
  overlayActions: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' },
  spinner: {
    width: 30, height: 30, border: `2px solid ${SPINNER_TRACK}`, borderTopColor: 'primary.main', borderRadius: '50%',
    animation: `${spin} 1s linear infinite`,
  },
  button: (theme) => ({
    display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500,
    p: '8px 13px', border: '1px solid', borderColor: 'divider', borderRadius: '5px', bgcolor: theme.palette.crucix.raised,
    color: 'text.primary', textDecoration: 'none', lineHeight: 'normal',
    '&:hover': { borderColor: theme.palette.crucix.borderBright, bgcolor: theme.palette.crucix.raised2, color: 'text.primary' },
  }),
  buttonPrimary: {
    bgcolor: 'primary.main', borderColor: 'primary.main', color: 'primary.contrastText',
    '&:hover': { bgcolor: 'primary.main', borderColor: 'primary.main', color: 'primary.contrastText' },
  },
  bar: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', mt: '12px' },
  nowPlaying: { fontSize: 13.5, fontWeight: 500, lineHeight: 'normal' },
  live: {
    display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: 12, color: (theme) => theme.palette.crucix.danger,
    p: '4px 9px', border: `1px solid ${LIVE_BORDER}`, borderRadius: '5px', bgcolor: LIVE_BG,
  },
  liveDot: { width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main', animation: `${pulse} 1.4s ease-in-out infinite` },
  barSpacer: { flex: 1 },
  control: (theme) => ({
    width: 38, height: 38, minWidth: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', p: 0,
    border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: theme.palette.crucix.raised,
    color: theme.palette.crucix.text2, fontSize: 15, boxShadow: 'none', textTransform: 'none',
    '&:hover': { borderColor: theme.palette.crucix.borderBright, color: isLight(theme) ? 'text.primary' : '#fff', bgcolor: theme.palette.crucix.raised2 },
    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'primary.main', borderColor: 'primary.main', color: 'primary.contrastText' },
  }),
  volume: { width: 110 },
  foot: { mt: '10px', fontSize: 12, color: (theme) => theme.palette.crucix.dim3, lineHeight: 1.55 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', mt: '12px' },
  cell: {
    position: 'relative', bgcolor: STAGE_BG, border: '1px solid', borderColor: 'divider', borderRadius: '6px',
    overflow: 'hidden', aspectRatio: '16/9',
  },
  cellVideo: { width: '100%', height: '100%', border: 0, display: 'block' },
  cellCaption: { position: 'absolute', left: 6, bottom: 6, fontSize: 11, lineHeight: 'normal', color: '#fff', textShadow: '0 1px 3px #000' },
} satisfies Record<string, SxProps<Theme>>;

export function channelDotSx(color: string): SxProps<Theme> {
  return [STYLES.channelDot, { bgcolor: color }];
}
