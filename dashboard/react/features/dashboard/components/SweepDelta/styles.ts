import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO, FONT_SANS } from '../../../../theme';

export const STYLES = {
  deltaStats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', mb: '12px' },
  deltaStat: (theme) => ({ p: '10px 12px', borderRadius: '6px', bgcolor: theme.palette.crucix.panel2, display: 'flex', flexDirection: 'column', gap: '2px' }),
  deltaStatKey: { fontSize: 11.5, color: (theme) => theme.palette.crucix.dim, whiteSpace: 'nowrap' },
  deltaStatValue: { fontFamily: FONT_MONO, fontSize: 16, color: 'text.primary' },
  deltaList: { overflowY: 'auto' },
  critical: { color: (theme) => theme.palette.crucix.warn, fontWeight: 600 },
  deltaEmpty: (theme) => ({ p: '12px', textAlign: 'center', color: theme.palette.crucix.dim, fontFamily: FONT_SANS, fontSize: 12 }),
} satisfies Record<string, SxProps<Theme>>;
