import { CLASSES } from '../../classes';
import type { AlertItem } from '../../types';
import { alertMs } from './alerts';

export interface AlertRowProps {
  alert: AlertItem;
}

export function AlertRow({ alert: a }: AlertRowProps) {
  const cities = a.cities ?? [];
  const extra = cities.length - 3;
  const ms = alertMs(a.time);
  const timeText = ms != null ? new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className={CLASSES.alertRow}>
      <span className={CLASSES.alertTime}>{timeText}</span>
      <span className={CLASSES.alertCities}>{cities.slice(0, 3).join(', ')}{extra > 0 ? ` +${extra}` : ''}</span>
      {a.drill ? <span className={CLASSES.alertDrill}>drill</span> : null}
    </div>
  );
}
