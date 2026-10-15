import { useMemo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES, cardSx } from './styles';

export interface PanelProps {
  id: string;
  title: ReactNode;
  badge?: ReactNode;
  headExtra?: ReactNode;
  isPadSm?: boolean;
  flex?: string;
  children: ReactNode;
}

export function Panel({ id, title, badge, headExtra, isPadSm, flex, children }: PanelProps) {
  const paperSx = useMemo(() => cardSx(flex), [flex]);
  return (
    <Paper className={CLASSES.card} id={id} sx={paperSx}>
      <Box className={CLASSES.cardHead} sx={STYLES.cardHead}>
        <Typography component="h3" className={CLASSES.cardTitle} sx={STYLES.cardTitle}>{title}</Typography>
        <Box className={CLASSES.cardHeadRight} sx={STYLES.cardHeadRight}>
          {badge ? <Box component="span" className={CLASSES.badge} sx={STYLES.badge}>{badge}</Box> : null}
          {headExtra}
        </Box>
      </Box>
      <Box className={clsx(CLASSES.cardBody, isPadSm && CLASSES.cardBodyPadSm)} sx={[STYLES.cardBody, !!isPadSm && STYLES.cardBodyPadSm]}>
        {children}
      </Box>
    </Paper>
  );
}
