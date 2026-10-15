import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { TABLET } from '../../styleConsts';

export const STYLES = {
  macroSection: { mb: '8px' },
  macroSectionTop: { mt: '6px' },
  macroCaption: { fontFamily: FONT_MONO, fontSize: 9, color: (theme) => theme.palette.crucix.dim, mb: '4px', letterSpacing: '1px' },
  wtiCaption: { fontFamily: FONT_MONO, fontSize: 10, color: (theme) => theme.palette.crucix.dim, mb: '4px' },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))',
    gap: '6px',
    [TABLET]: { gridTemplateColumns: 'repeat(2,1fr)' },
  },
  spark: { display: 'flex', alignItems: 'flex-end', gap: '2px', height: 24, mt: '6px' },
} satisfies Record<string, SxProps<Theme>>;
