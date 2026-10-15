import { useCallback, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { makeLabel } from '../../label';
import { STYLES } from '../../styles';
import type { AlertItem, PanelDataProps } from '../../types';
import { AlertRow } from '../AlertRow';
import { alertMs } from '../AlertRow/alerts';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';

export interface AlertsPanelProps extends PanelDataProps {
  alerts?: AlertItem[];
}

const HOUR_MS = 3_600_000;

function recentAlerts(alerts: AlertItem[], nowMs: number): AlertItem[] {
  return alerts
    .filter((a) => {
      const ms = alertMs(a.time);
      return ms != null && nowMs - ms < HOUR_MS;
    })
    .slice(0, 10);
}

export function AlertsPanel({ t, alerts }: AlertsPanelProps) {
  const tr = makeLabel(t);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const onToggleSound = useCallback(() => setIsSoundOn((v) => !v), []);

  let badge: ReactNode;
  let body: ReactNode;
  if (!alerts) {
    badge = 'loading';
    body = <PanelSource>Loading{'…'}</PanelSource>;
  } else {
    const recent = recentAlerts(alerts, Date.now());
    badge = recent.length ? `${recent.length} in 1h` : 'Quiet';
    body = recent.length
      ? <>{recent.map((a, i) => <AlertRow key={i} alert={a} />)}</>
      : <PanelSource style={STYLES.softFaded}>No active alerts in the last hour.</PanelSource>;
  }

  return (
    <Panel
      id="pAlerts"
      title={tr('panels.airRaidAlerts', 'Air-raid alerts')}
      badge={badge}
      flex="1 1 260px"
      headExtra={(
        <button type="button" className={clsx(CLASSES.alertsSound, isSoundOn && CLASSES.alertsSoundOn)} onClick={onToggleSound} title="Sound on new alerts">
          {isSoundOn ? '🔊' : '🔇'}
        </button>
      )}
    >
      {body}
    </Panel>
  );
}
