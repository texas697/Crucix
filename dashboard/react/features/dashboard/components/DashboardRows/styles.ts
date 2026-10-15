import type { SxProps, Theme } from '@mui/material/styles';
import { TABLET } from '../../styleConsts';

export const STYLES = {
  main: {
    minHeight: '100vh',
    position: 'relative',
    p: '20px 24px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    [TABLET]: { p: '12px' },
  },
} satisfies Record<string, SxProps<Theme>>;
