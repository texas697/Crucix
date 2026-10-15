import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { withSx } from '../../sx';
import { STYLES } from './styles';

export interface StatusBannerProps {
  tone: 'ok' | 'anom';
  children: ReactNode;
  note?: ReactNode;
  sx?: SxProps<Theme>;
}

export function StatusBanner({ tone, children, note, sx }: StatusBannerProps) {
  const isOk = tone === 'ok';
  return (
    <Box
      className={clsx(CLASSES.statusBanner, isOk ? CLASSES.statusBannerOk : CLASSES.statusBannerAnom)}
      sx={withSx([STYLES.banner, isOk ? STYLES.ok : STYLES.anom], sx)}
    >
      {children}
      {note ? <Box component="span" className={CLASSES.statusBannerNote} sx={STYLES.note}>{note}</Box> : null}
    </Box>
  );
}
