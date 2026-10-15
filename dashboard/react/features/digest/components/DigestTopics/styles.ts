import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_SANS } from '../../../../theme';

export const STYLES = {
  topics: { display: 'flex', flexWrap: 'wrap', gap: '6px', m: '4px 0 12px' },
  topic: (theme) => ({
    height: 'auto',
    fontFamily: FONT_SANS,
    fontSize: 12.5,
    p: '5px 11px',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '5px',
    color: 'text.secondary',
    cursor: 'pointer',
    bgcolor: 'transparent',
    '& .MuiChip-label': { display: 'inline-flex', gap: '6px', p: 0, overflow: 'visible' },
    '&:hover, &.MuiChip-clickable:hover': { borderColor: theme.palette.crucix.borderBright, color: 'text.primary', bgcolor: 'transparent' },
  }),
  topicActive: (theme) => ({ borderColor: theme.palette.crucix.borderBright, color: 'text.primary' }),
  topicCount: { color: (theme) => theme.palette.crucix.dim3 },
} satisfies Record<string, SxProps<Theme>>;
