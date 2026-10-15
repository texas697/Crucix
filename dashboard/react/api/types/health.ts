export interface HealthResponse {
  status: string;
  uptime: number;
  lastSweep: string | null;
  nextSweep: string | null;
  sweepInProgress: boolean;
  sweepStartedAt: string | null;
  sourcesOk: number;
  sourcesFailed: number;
  llmEnabled: boolean;
  llmProvider: string | null;
  authEnabled: boolean;
  byokEnabled: boolean;
  sweepMode: string;
  refreshIntervalMinutes: number;
  language: string;
}
