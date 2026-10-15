// Standalone snapshot entry (P8). Mounts `SnapshotApp` from the snapshot embedded into the exported
// HTML by `dashboard/inject.mjs`. This file is the single input of the IIFE build
// (vite.standalone.config.ts) and must stay dependency-light and `file:`-safe: it reads only the
// injected global, applies the stored theme and renders into `#root`.
//
// The snapshot is exposed as `window.__CRUCIX_SNAPSHOT__` by the template marker. A legacy
// `let D = ...` template keeps its own script, but we also read a global `D` when present so a caller
// that assigns `window.D` still works.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SnapshotApp } from './SnapshotApp';
import { applyTheme, readStoredTheme, resolveTheme } from '../shared/theme';
import type { SweepData } from '../api/types';
import './export.css';

interface SnapshotWindow {
  __CRUCIX_SNAPSHOT__?: unknown;
  D?: unknown;
}

/** Read the injected snapshot, tolerating either the new global or a legacy `window.D`. */
function readEmbeddedSnapshot(): SweepData | null {
  const w = window as unknown as SnapshotWindow;
  const raw = w.__CRUCIX_SNAPSHOT__ ?? w.D;
  if (!raw || typeof raw !== 'object') return null;
  return raw as SweepData;
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

const container = document.getElementById('root');
if (!container) throw new Error('[crucix] missing #root for the standalone snapshot');

// Apply the stored theme before first paint (the app shell does the same).
applyTheme(resolveTheme(readStoredTheme(safeStorage())), document.documentElement);

createRoot(container).render(
  <StrictMode>
    <SnapshotApp snapshot={readEmbeddedSnapshot()} />
  </StrictMode>,
);
