import clsx from 'clsx';
import type { HealthResponse } from '../../../../api/types';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface StartupStateProps {
  health: HealthResponse | null;
  now?: () => number;
}

function startupLines(health: HealthResponse | null, nowMs: number): string[] {
  const startedAt = health?.sweepStartedAt ? new Date(health.sweepStartedAt).getTime() : null;
  const elapsed = startedAt ? Math.max(0, Math.round((nowMs - startedAt) / 1000)) : null;
  return [
    'INITIALIZING CRUCIX ENGINE',
    'CONNECTING TO SOURCE GRID',
    health?.sweepInProgress ? `SWEEP IN PROGRESS${elapsed !== null ? ` · ${elapsed}s` : ''}` : 'AWAITING FIRST SWEEP',
    health?.lastSweep ? 'DATA INBOUND' : 'NO DATA YET',
    'This page updates itself; you do not need to refresh.',
  ];
}

export function StartupState({ health, now = Date.now }: StartupStateProps) {
  const lines = startupLines(health, now());
  return (
    <div id="boot" className={CLASSES.boot}>
      <div className={CLASSES.bootLogo} style={STYLES.visible}>
        <img className={clsx(CLASSES.bootLogoImg, CLASSES.bootLogoDark)} src="/brand/mfb-loading-dark-transparent.png" alt="MFB Services Intelligence" width="1744" height="892" />
        <img className={clsx(CLASSES.bootLogoImg, CLASSES.bootLogoLight)} src="/brand/mfb-loading-light-transparent.png" alt="" aria-hidden="true" width="1744" height="892" />
      </div>
      <div id="bootLines" className={CLASSES.bootLines} style={STYLES.visible} role="status" aria-live="polite">
        {lines.map((line) => <div key={line} className={CLASSES.bootLine}>{line}</div>)}
      </div>
      <div id="bootFinal" className={CLASSES.bootFinal} style={STYLES.visible}>{health?.sweepInProgress ? 'SWEEPING' : 'AWAITING FIRST SWEEP'}</div>
    </div>
  );
}
