import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { SweepData } from '../api/types';
import { AppProviders } from '../app/AppProviders';
import { safeStorage } from '../app/AppProviders/utils';
import { applyTheme, readStoredTheme, resolveTheme } from '../shared/theme';
import { SnapshotApp } from './SnapshotApp';

interface SnapshotWindow {
  __CRUCIX_SNAPSHOT__?: unknown;
  D?: unknown;
}

function readEmbeddedSnapshot(): SweepData | null {
  const w = window as unknown as SnapshotWindow;
  const raw = w.__CRUCIX_SNAPSHOT__ ?? w.D;
  if (!raw || typeof raw !== 'object') return null;
  return raw as SweepData;
}

const container = document.getElementById('root');
if (!container) throw new Error('[crucix] missing #root for the standalone snapshot');

applyTheme(resolveTheme(readStoredTheme(safeStorage())), document.documentElement);

createRoot(container).render(
  <StrictMode>
    <AppProviders hasSession={false}>
      <SnapshotApp snapshot={readEmbeddedSnapshot()} />
    </AppProviders>
  </StrictMode>,
);
