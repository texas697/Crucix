import type { HealthResponse, SweepData } from '../api/types';

export function healthFromSnapshot(snapshot: SweepData | null): HealthResponse | null {
  if (!snapshot?.meta) return null;
  return {
    status: 'snapshot',
    uptime: 0,
    lastSweep: snapshot.meta.timestamp,
    nextSweep: null,
    sweepInProgress: false,
    sweepStartedAt: null,
    sourcesOk: snapshot.meta.sourcesOk,
    sourcesFailed: snapshot.meta.sourcesFailed,
    llmEnabled: false,
    llmProvider: null,
    authEnabled: false,
    byokEnabled: false,
    sweepMode: 'snapshot',
    refreshIntervalMinutes: 0,
    language: 'en',
  };
}
