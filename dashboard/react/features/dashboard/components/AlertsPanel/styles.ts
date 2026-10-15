import type { SxProps, Theme } from '@mui/material/styles';

export const STYLES = {
  alertsSound: (theme) => ({
    width: 28,
    height: 26,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '5px',
    bgcolor: theme.palette.crucix.raised,
    color: theme.palette.crucix.text2,
    boxShadow: 'none',
    fontSize: 13,
    '&:hover': { bgcolor: theme.palette.crucix.raised, borderColor: 'divider', color: theme.palette.crucix.text2 },
  }),
  alertsSoundOn: (theme) => ({
    bgcolor: 'primary.main',
    borderColor: 'primary.main',
    color: theme.palette.crucix.onAccent,
    '&:hover': { bgcolor: 'primary.main', borderColor: 'primary.main', color: theme.palette.crucix.onAccent },
  }),
} satisfies Record<string, SxProps<Theme>>;
