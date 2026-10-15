import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { LOCAL_COLORS } from '../../styleConsts';

export const STYLES = {
  layerItem: (theme) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    p: '9px 10px',
    borderRadius: '6px',
    transition: 'background .15s',
    '&:hover': { bgcolor: theme.palette.crucix.raised },
  }),
  layerLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 },
  layerDot: { width: 7, height: 7, borderRadius: '50%', flex: 'none' },
  layerName: { fontSize: 13.5, fontWeight: 400, color: 'text.primary' },
  layerSub: { fontSize: 12, color: (theme) => theme.palette.crucix.dim2 },
  layerCount: { fontFamily: FONT_MONO, fontSize: 14, fontWeight: 400, color: 'text.primary' },
} satisfies Record<string, SxProps<Theme>>;

export const LAYER_DOT_STYLES: Record<string, SxProps<Theme>> = {
  air: { bgcolor: (theme) => theme.palette.crucix.green },
  thermal: { bgcolor: (theme) => theme.palette.crucix.red },
  sdr: { bgcolor: (theme) => theme.palette.crucix.blue },
  nuke: { bgcolor: (theme) => theme.palette.crucix.amber },
  maritime: { bgcolor: (theme) => theme.palette.crucix.violet },
  health: { bgcolor: (theme) => theme.palette.crucix.green },
  disaster: { bgcolor: LOCAL_COLORS.orange },
  outage: { bgcolor: LOCAL_COLORS.violet },
  news: { bgcolor: (theme) => theme.palette.crucix.sky },
  space: { bgcolor: (theme) => theme.palette.crucix.violet },
};
