import type { ReactNode } from 'react';
import IconButton from '@mui/material/IconButton';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { makeLabel } from '../../label';
import { TONE_STYLES } from '../../styles';
import type { AlertItem, PanelDataProps } from '../../types';
import { AlertRow } from '../AlertRow';
import { alertMs } from '../AlertRow/alerts';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';
import { useAlertsSound } from './hooks/useAlertsSound';
import { STYLES } from './styles';

export interface AlertsPanelProps extends PanelDataProps {
  alerts?: AlertItem[];
}

const HOUR_MS = 3_600_000;
const MAX_ROWS = 10;

function recentAlerts(alerts: AlertItem[], nowMs: number): AlertItem[] {
  return alerts.filter((a) => {
    const ms = alertMs(a.time);
    return ms != null && nowMs - ms < HOUR_MS;
  });
}

export function AlertsPanel({ t, alerts }: AlertsPanelProps) {
  const tr = makeLabel(t);
  const { isSoundOn, onToggleSound } = useAlertsSound();

  let badge: ReactNode;
  let body: ReactNode;
  if (!alerts) {
    badge = 'loading';
    body = <PanelSource>Loading{'…'}</PanelSource>;
  } else {
    const recent = recentAlerts(alerts, Date.now());
    badge = recent.length ? `${recent.length} in 1h` : 'Quiet';
    body = recent.length
      ? <>{recent.slice(0, MAX_ROWS).map((a, i) => <AlertRow key={i} alert={a} />)}</>
      : <PanelSource sx={TONE_STYLES.softFaded}>No active alerts in the last hour.</PanelSource>;
  }

  return (
    <Panel
      id="pAlerts"
      title={tr('panels.airRaidAlerts', 'Air-raid alerts')}
      badge={badge}
      flex="1 1 260px"
      headExtra={(
        <IconButton
          className={clsx(CLASSES.alertsSound, isSoundOn && CLASSES.alertsSoundOn)}
          sx={[STYLES.alertsSound, isSoundOn && STYLES.alertsSoundOn]}
          onClick={onToggleSound}
          title="Sound on new alerts"
          aria-pressed={isSoundOn}
        >
          {isSoundOn ? '🔊' : '🔇'}
        </IconButton>
      )}
    >
      {body}
    </Panel>
  );
}
