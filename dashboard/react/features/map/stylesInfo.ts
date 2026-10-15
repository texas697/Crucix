import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../theme';
import { LOW_PERF, TABLET, isLight, type SxMap } from './stylesShared';

export const INFO_STYLES = {
  infoBackdrop: (theme) => ({
    bgcolor: isLight(theme) ? 'rgba(16,24,40,0.35)' : 'rgba(2,6,10,0.72)',
    backdropFilter: 'blur(10px)',
    [LOW_PERF]: { backdropFilter: 'none' },
  }),
  infoPanel: (theme) => ({
    position: 'absolute',
    top: 18,
    right: 18,
    m: 0,
    width: 'min(420px, calc(100vw - 32px))',
    maxWidth: 'none',
    maxHeight: 'calc(100vh - 36px)',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid',
    borderColor: theme.palette.crucix.borderBright,
    borderRadius: '8px',
    bgcolor: isLight(theme) ? 'rgba(255,255,255,0.98)' : 'rgba(10,13,20,0.96)',
    boxShadow: isLight(theme) ? '0 18px 48px rgba(16,24,40,0.2)' : '0 18px 48px rgba(0,0,0,0.45)',
    [TABLET]: {
      top: 'auto', right: 0, left: 0, bottom: 0, width: '100%', maxHeight: 'min(72vh, 720px)',
      borderRadius: '8px 8px 0 0', borderBottom: 'none',
    },
  }),
  infoHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', p: '14px 16px 10px', borderBottom: '1px solid', borderColor: 'divider' },
  infoKicker: { fontFamily: FONT_SANS, fontSize: 11, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'primary.main', mb: '5px' },
  infoTitle: { fontSize: 18, fontWeight: 600, lineHeight: 1.15 },
  infoSub: (theme) => ({ fontSize: 12, lineHeight: 1.45, color: theme.palette.crucix.dim, mt: '6px' }),
  infoClose: (theme) => ({
    width: 30, height: 30, borderRadius: '6px', fontSize: 18, boxShadow: 'none', flexShrink: 0,
    bgcolor: theme.palette.crucix.raised, color: theme.palette.crucix.dim, border: '1px solid', borderColor: theme.palette.crucix.border,
    '&:hover': { color: 'text.primary', bgcolor: theme.palette.crucix.raised },
  }),
  infoBody: { overflow: 'auto', p: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  infoCard: (theme) => ({ p: '12px', border: '1px solid', borderColor: 'divider', borderRadius: '6px', bgcolor: theme.palette.crucix.panel2 }),
  infoLine: (theme) => ({ fontSize: 12, lineHeight: 1.5, color: theme.palette.crucix.text2, '& + &': { mt: '5px' } }),
  infoLabel: (theme) => ({ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.palette.crucix.dim, mr: '6px' }),
  infoFoot: (theme) => ({ p: '10px 16px 14px', borderTop: '1px solid', borderColor: 'divider', fontFamily: FONT_MONO, fontSize: 9, lineHeight: 1.5, color: theme.palette.crucix.dim3 }),
} satisfies SxMap;

export function infoLabelSx(color: string | undefined): SxProps<Theme> {
  return color ? [INFO_STYLES.infoLabel, { color }] : INFO_STYLES.infoLabel;
}
