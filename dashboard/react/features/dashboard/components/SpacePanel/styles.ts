import type { SxProps, Theme } from '@mui/material/styles';

export const STYLES = {
  panelNote: { m: '12px 0 0', fontSize: 12.5, lineHeight: 1.55, color: (theme) => theme.palette.crucix.sky },
} satisfies Record<string, SxProps<Theme>>;
