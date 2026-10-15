import type { SxProps, Theme } from '@mui/material/styles';
import { sourceColor } from '../../styleConsts';

export const STYLES = {
  newsItem: (theme) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    p: '12px 10px',
    borderRadius: '6px',
    color: 'text.primary',
    textDecoration: 'none',
    cursor: 'default',
    transition: 'background .15s',
    '&:hover': { bgcolor: theme.palette.crucix.raised },
  }),
  newsItemClickable: { cursor: 'pointer' },
  newsMeta: { display: 'flex', gap: '8px', fontSize: 11.5, color: (theme) => theme.palette.crucix.dim2, alignItems: 'center' },
  newsSource: { color: (theme) => sourceColor(theme) },
  newsLink: { ml: 'auto', color: (theme) => theme.palette.crucix.dim },
  newsTitle: { fontSize: 13.5, lineHeight: 1.45, color: 'text.primary' },
  newsTitleUrgent: { color: (theme) => theme.palette.crucix.danger },
} satisfies Record<string, SxProps<Theme>>;
