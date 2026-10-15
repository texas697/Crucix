import type { ApiClient } from '../client';
import type { HealthResponse, SweepData } from '../types';

export interface TransportTimers {
  setIntervalImpl: (handler: () => void, timeout: number) => unknown;
  clearIntervalImpl: (id: unknown) => void;
}

export interface TransportOptions {
  client: ApiClient;
  onData: (data: SweepData) => void;
  onHealth?: (health: HealthResponse) => void;
  onSessionExpired?: () => void;
  onSweepError?: (error: unknown) => void;
  pollMs?: number;
  startingRetryMs?: number;
  sseEnabled?: boolean;
  now?: () => number;
  setIntervalImpl?: TransportTimers['setIntervalImpl'];
  clearIntervalImpl?: TransportTimers['clearIntervalImpl'];
  EventSourceImpl?: typeof EventSource;
}

export interface Transport {
  start(): () => void;
  stop(): void;
}

export interface DocumentWithPrerender extends Document {
  prerendering?: boolean;
}

export interface SweepDataFetcher {
  fetchData(): Promise<void>;
  isStarting(): boolean;
  cancelStartingRetry(): void;
}

export interface HealthPoller {
  poll(): Promise<void>;
  reset(): void;
}

export interface SweepStream {
  close(): void;
}

export interface SweepFrame {
  type: string;
  data?: unknown;
  error?: unknown;
}
