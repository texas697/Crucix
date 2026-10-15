import type { SxProps, Theme } from '@mui/material/styles';

export const STYLES = {
  panelSource: (theme) => ({
    fontSize: 11,
    color: theme.palette.crucix.dim3,
    lineHeight: 1.5,
    mt: '6px',
    '& a': { color: 'primary.main', textDecoration: 'none' },
  }),
} satisfies Record<string, SxProps<Theme>>;
