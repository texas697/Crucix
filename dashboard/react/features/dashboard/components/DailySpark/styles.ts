import type { SxProps, Theme } from '@mui/material/styles';

export const STYLES = {
  spark: { verticalAlign: 'middle', mr: '8px', opacity: 0.8 },
  sparkLine: { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 },
} satisfies Record<string, SxProps<Theme>>;
