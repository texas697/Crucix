import type { SxProps, Theme } from '@mui/material/styles';

export const STYLES = {
  skeleton: { display: 'flex', flexDirection: 'column', gap: '10px', p: '18px' },
  top: { height: 18, width: '45%' },
  title: { height: 22, width: '100%' },
  titleTail: { height: 22, width: '70%' },
  line: { height: 14, width: '100%' },
  lineTail: { height: 14, width: '85%' },
  foot: { height: 30, width: '40%', mt: 'auto' },
} satisfies Record<string, SxProps<Theme>>;
