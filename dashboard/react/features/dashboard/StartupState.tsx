import type { HealthResponse } from '../../api/types';

// The startup display shown before the first sweep. Replaces the legacy loading.html, whose
// EventSource error handling reloaded the whole page every 3 seconds behind Firebase Hosting (P0
// defect D1). This version never reloads: it polls through the shared transport and shows progress
// from /api/health until data arrives.
//
// It reuses the dashboard's ported boot markup (#boot / .boot-logo / #bootLines / #bootFinal) so it
// is styled without a second stylesheet; the opacity is set inline because the legacy animated those
// elements from GSAP (which the React startup does not depend on).

export interface StartupStateProps {
  health: HealthResponse | null;
  now?: () => number;
}

export function StartupState({ health, now = Date.now }: StartupStateProps) {
  const startedAt = health?.sweepStartedAt ? new Date(health.sweepStartedAt).getTime() : null;
  const elapsed = startedAt ? Math.max(0, Math.round((now() - startedAt) / 1000)) : null;

  const lines = [
    'INITIALIZING CRUCIX ENGINE',
    'CONNECTING TO SOURCE GRID',
    health?.sweepInProgress ? `SWEEP IN PROGRESS${elapsed !== null ? ` · ${elapsed}s` : ''}` : 'AWAITING FIRST SWEEP',
    health?.lastSweep ? 'DATA INBOUND' : 'NO DATA YET',
    'This page updates itself; you do not need to refresh.',
  ];

  return (
    <div id="boot">
      <div className="boot-logo" style={{ opacity: 1 }}>
        <img className="boot-logo-img boot-logo-dark" src="/brand/mfb-loading-dark-transparent.png" alt="MFB Services Intelligence" width="1744" height="892" />
        <img className="boot-logo-img boot-logo-light" src="/brand/mfb-loading-light-transparent.png" alt="" aria-hidden="true" width="1744" height="892" />
      </div>
      <div id="bootLines" style={{ opacity: 1 }} role="status" aria-live="polite">
        {lines.map((line) => <div key={line}>{line}</div>)}
      </div>
      <div id="bootFinal" style={{ opacity: 1 }}>{health?.sweepInProgress ? 'SWEEPING' : 'AWAITING FIRST SWEEP'}</div>
    </div>
  );
}
