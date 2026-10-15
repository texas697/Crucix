import type { SxProps, Theme } from '@mui/material/styles';

export const STYLES = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '14px' },
} satisfies Record<string, SxProps<Theme>>;
