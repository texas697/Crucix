import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_SANS } from '../../../../theme';
import { PHONE } from '../../styles';

export const STYLES = {
  hero: { alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', m: '22px 0 16px' },
  heroTitle: { fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 'normal', [PHONE]: { fontSize: 24 } },
  heroLead: { fontSize: 14.5, color: 'text.secondary', maxWidth: 680, lineHeight: 1.55, mt: '8px' },
  status: { fontFamily: FONT_SANS, fontSize: 12.5, color: (theme) => theme.palette.crucix.dim2, letterSpacing: 0, m: 0 },
} satisfies Record<string, SxProps<Theme>>;
