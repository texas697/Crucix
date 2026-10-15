import { ApiError } from '../client';
import type { ApiClient } from '../client';
import type { HealthResponse } from '../types';
import { HEALTH_PATH } from './consts';
import type { HealthPoller } from './types';

export interface CreateHealthPollerArgs {
  client: ApiClient;
  now: () => number;
  onHealth?: (health: HealthResponse) => void;
  onSessionExpired?: () => void;
  onSweepChanged: () => Promise<void>;
  onStop: () => void;
}

export function createHealthPoller(args: CreateHealthPollerArgs): HealthPoller {
  const { client, now, onHealth, onSessionExpired, onSweepChanged, onStop } = args;
  let lastSweep: string | null | undefined;
  let lastPollAt = 0;
  let isPolling = false;

  function reset(): void {
    lastSweep = undefined;
    lastPollAt = 0;
  }

  async function poll(): Promise<void> {
    if (isPolling) return;
    const polledAt = now();
    if (polledAt < lastPollAt) return;
    lastPollAt = polledAt;
    isPolling = true;
    try {
      const health = await client.get<HealthResponse>(HEALTH_PATH);
      onHealth?.(health);
      if (health.lastSweep !== lastSweep) {
        lastSweep = health.lastSweep;
        await onSweepChanged();
      }
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'session-expired') {
        onSessionExpired?.();
        onStop();
      }
    } finally {
      isPolling = false;
    }
  }

  return { poll, reset };
}
