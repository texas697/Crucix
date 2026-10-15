import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import type { AlertItem } from '../../types';
import { alertMs } from './alerts';
import { STYLES } from './styles';

export interface AlertRowProps {
  alert: AlertItem;
}

export function AlertRow({ alert: a }: AlertRowProps) {
  const cities = a.cities ?? [];
  const extra = cities.length - 3;
  const ms = alertMs(a.time);
  const timeText = ms != null ? new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <Box className={CLASSES.alertRow} sx={STYLES.alertRow}>
      <Box component="span" className={CLASSES.alertTime} sx={STYLES.alertTime}>{timeText}</Box>
      <Box component="span" className={CLASSES.alertCities} sx={STYLES.alertCities}>{cities.slice(0, 3).join(', ')}{extra > 0 ? ` +${extra}` : ''}</Box>
      {a.drill ? <Box component="span" className={CLASSES.alertDrill} sx={STYLES.alertDrill}>drill</Box> : null}
    </Box>
  );
}
