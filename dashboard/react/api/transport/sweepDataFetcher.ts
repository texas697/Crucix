import { ApiError } from '../client';
import type { ApiClient } from '../client';
import type { SweepData } from '../types';
import { DATA_PATH } from './consts';
import type { SweepDataFetcher, TransportTimers } from './types';

export interface CreateSweepDataFetcherArgs {
  client: ApiClient;
  timers: TransportTimers;
  startingRetryMs: number;
  onData: (data: SweepData) => void;
  onSessionExpired?: () => void;
  onSweepError?: (error: unknown) => void;
}

export function createSweepDataFetcher(args: CreateSweepDataFetcherArgs): SweepDataFetcher {
  const { client, timers, startingRetryMs, onData, onSessionExpired, onSweepError } = args;
  let seq = 0;
  let retryId: unknown = null;

  function cancelStartingRetry(): void {
    if (retryId === null) return;
    timers.clearIntervalImpl(retryId);
    retryId = null;
  }

  function scheduleStartingRetry(): void {
    if (retryId !== null) return;
    retryId = timers.setIntervalImpl(() => {
      void fetchData();
    }, startingRetryMs);
  }

  function handleFailure(err: unknown): void {
    const kind = err instanceof ApiError ? err.kind : null;
    if (kind === 'starting' || (kind === 'network' && retryId !== null)) {
      scheduleStartingRetry();
      return;
    }
    cancelStartingRetry();
    if (kind === 'session-expired') {
      onSessionExpired?.();
      return;
    }
    if (kind === 'not-found') return;
    onSweepError?.(err);
  }

  async function fetchData(): Promise<void> {
    const id = ++seq;
    try {
      const data = await client.get<SweepData>(DATA_PATH);
      if (id !== seq) return;
      cancelStartingRetry();
      onData(data);
    } catch (err) {
      if (id !== seq) return;
      handleFailure(err);
    }
  }

  return { fetchData, isStarting: () => retryId !== null, cancelStartingRetry };
}
