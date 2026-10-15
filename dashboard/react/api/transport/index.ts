import { DEFAULT_POLL_MS, STARTING_RETRY_MS } from './consts';
import { createHealthPoller } from './healthPoller';
import { startAfterPrerender } from './prerender';
import { createSweepDataFetcher } from './sweepDataFetcher';
import { openSweepStream, resolveEventSource, shouldUseSse } from './sweepStream';
import { resolveTimers } from './timers';
import type { SweepData } from '../types';
import type { SweepStream, Transport, TransportOptions } from './types';

function isSseEnabled(sseEnabled: boolean | undefined): boolean {
  if (typeof sseEnabled === 'boolean') return sseEnabled;
  return shouldUseSse(typeof location !== 'undefined' ? location.hostname : '');
}

export function createTransport(options: TransportOptions): Transport {
  const {
    client,
    onData,
    onHealth,
    onSessionExpired,
    onSweepError,
    pollMs = DEFAULT_POLL_MS,
    startingRetryMs = STARTING_RETRY_MS,
    now = () => Date.now(),
    EventSourceImpl,
  } = options;
  const timers = resolveTimers(options);
  let isRunning = false;
  let intervalId: unknown = null;
  let stream: SweepStream | null = null;

  const fetcher = createSweepDataFetcher({ client, timers, startingRetryMs, onData, onSessionExpired, onSweepError });
  const poller = createHealthPoller({
    client,
    now,
    onHealth,
    onSessionExpired,
    onSweepChanged: fetcher.fetchData,
    onStop: () => stop(),
  });

  function onStreamUpdate(data: SweepData): void {
    fetcher.cancelStartingRetry();
    onData(data);
  }

  function onStreamConnected(): void {
    if (fetcher.isStarting()) void fetcher.fetchData();
  }

  function openStream(): void {
    if (!isSseEnabled(options.sseEnabled)) return;
    const EventSourceCtor = resolveEventSource(EventSourceImpl);
    if (!EventSourceCtor) return;
    stream = openSweepStream({
      EventSourceCtor,
      onUpdate: onStreamUpdate,
      onConnected: onStreamConnected,
      onSweepError: (err) => onSweepError?.(err),
    });
  }

  function begin(): void {
    if (isRunning) return;
    isRunning = true;
    poller.reset();
    void poller.poll();
    intervalId = timers.setIntervalImpl(() => {
      void poller.poll();
    }, pollMs);
    openStream();
  }

  function stop(): void {
    isRunning = false;
    fetcher.cancelStartingRetry();
    if (intervalId !== null) {
      timers.clearIntervalImpl(intervalId);
      intervalId = null;
    }
    stream?.close();
    stream = null;
  }

  return { start: () => startAfterPrerender(begin, stop), stop };
}

export { shouldUseSse } from './sweepStream';
export type { Transport, TransportOptions, TransportTimers } from './types';
