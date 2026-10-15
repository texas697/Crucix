// Lifecycle-managed data transport. Exactly one transport is created per mounted app (never per
// panel): it owns the 60s health poll, the SSE stream and the stale-response guard shared by every
// panel, so panels can't multiply timers/streams.
//
// Prerendering: speculation-rules prerendering runs page scripts while the page is invisible. start()
// is a no-op returning a cleanup until `document.prerendering` flips to false, then begins once.
//
// This module never replays POSTs and makes no paid calls; it only reads `/api/health`, `/api/data`
// and `/events`.

import { ApiError } from './client';
import type { ApiClient } from './client';
import type { HealthResponse, SweepData } from './types';

/**
 * Whether the SSE stream should be used for a given hostname. Streams are only opened on local dev
 * or Cloud Run (direct or through the same-origin rewrite); elsewhere (e.g. Firebase Hosting, which
 * buffers responses) the 60s poll is the only mechanism.
 */
export function shouldUseSse(hostname: string): boolean {
  if (!hostname) return false;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.run.app');
}

/** Options for {@link createTransport}. Test seams (`now`, timers, EventSource) are all injectable. */
export interface TransportOptions {
  client: ApiClient;
  /** Called with each fresh envelope (from the poll or an SSE `update`). */
  onData: (data: SweepData) => void;
  /** Called with each successful health poll. */
  onHealth?: (health: HealthResponse) => void;
  /** Called when the health poll returns 401. */
  onSessionExpired?: () => void;
  /** Called when an SSE `sweep_error` arrives or a data fetch fails for a non-auth reason. */
  onSweepError?: (error: unknown) => void;
  /** Health poll interval in milliseconds. Defaults to 60000. */
  pollMs?: number;
  /** Force SSE on/off; when omitted, derived from `location.hostname` via {@link shouldUseSse}. */
  sseEnabled?: boolean;
  /** Clock seam. */
  now?: () => number;
  /** Timer seam; returns an opaque id passed back to `clearIntervalImpl`. */
  setIntervalImpl?: (handler: () => void, timeout: number) => unknown;
  /** Timer seam. */
  clearIntervalImpl?: (id: unknown) => void;
  /** EventSource constructor seam. */
  EventSourceImpl?: typeof EventSource;
}

/** A started/stopped transport handle. */
export interface Transport {
  /** Begins polling/streaming; returns a cleanup. No-op (with cleanup) while prerendering. */
  start(): () => void;
  /** Stops polling and closes the stream. Safe to call repeatedly or after `start`. */
  stop(): void;
}

interface DocumentWithPrerender extends Document {
  prerendering?: boolean;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Creates a transport. Call `start()` once per mount and `stop()` on unmount; calling `stop()` then
 * `start()` again must not accumulate timers or streams.
 */
export function createTransport(options: TransportOptions): Transport {
  const {
    client,
    onData,
    onHealth,
    onSessionExpired,
    onSweepError,
    pollMs = 60000,
    now = () => Date.now(),
    // Explicit wrappers keep the broad `(id: unknown) => void` seam type; the DOM `clearInterval`
    // only accepts a number, so the fallback narrows there.
    setIntervalImpl = (handler: () => void, timeout: number) => setInterval(handler, timeout),
    clearIntervalImpl = (id: unknown) => {
      clearInterval(id as ReturnType<typeof setInterval>);
    },
    EventSourceImpl,
  } = options;

  let running = false;
  let intervalId: unknown = null;
  let stream: EventSource | null = null;
  let streamListeners: Array<[string, EventListener]> = [];

  // Health-poll bookkeeping.
  let lastSweep: string | null | undefined;
  let lastPollAt = 0;
  let polling = false;

  // Stale-response guard: each data request takes the next id; a response is applied only if it is
  // still the newest request issued.
  let seq = 0;

  function resolveSse(): boolean {
    if (typeof options.sseEnabled === 'boolean') return options.sseEnabled;
    const hostname = typeof location !== 'undefined' ? location.hostname : '';
    return shouldUseSse(hostname);
  }

  async function fetchData(): Promise<void> {
    const id = ++seq;
    try {
      const data = await client.get<SweepData>('/api/data');
      if (id !== seq) return; // A newer request superseded this one.
      onData(data);
    } catch (err) {
      if (id !== seq) return;
      if (err instanceof ApiError) {
        if (err.kind === 'session-expired') {
          onSessionExpired?.();
          return;
        }
        // "starting" (first sweep) and "not-found" (source absent) are expected and harmless.
        if (err.kind === 'starting' || err.kind === 'not-found') return;
      }
      onSweepError?.(err);
    }
  }

  async function poll(): Promise<void> {
    if (polling) return;
    const polledAt = now();
    if (polledAt < lastPollAt) return; // Clock went backwards; ignore.
    lastPollAt = polledAt;
    polling = true;
    try {
      const health = await client.get<HealthResponse>('/api/health');
      onHealth?.(health);
      if (health.lastSweep !== lastSweep) {
        lastSweep = health.lastSweep;
        await fetchData();
      }
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'session-expired') {
        onSessionExpired?.();
        stop();
        return;
      }
      // Any other health failure is transient; keep polling.
    } finally {
      polling = false;
    }
  }

  function openStream(): void {
    if (!resolveSse()) return;
    const EventSourceCtor = EventSourceImpl ?? (typeof EventSource !== 'undefined' ? EventSource : undefined);
    if (!EventSourceCtor) return;

    const next = new EventSourceCtor('/events');
    stream = next;
    streamListeners = [];

    const add = (type: string, listener: EventListener): void => {
      next.addEventListener(type, listener);
      streamListeners.push([type, listener]);
    };

    // `connected` and `sweep_start` are informational; the data itself arrives on `update`.
    add('connected', () => {});
    add('sweep_start', () => {});
    add('update', (event) => {
      const message = event as MessageEvent;
      try {
        const parsed = JSON.parse(String(message.data)) as unknown;
        if (isRecord(parsed) && 'data' in parsed) onData(parsed.data as SweepData);
      } catch {
        // Malformed frame: ignore rather than tear down the stream.
      }
    });
    add('sweep_error', (event) => {
      onSweepError?.(event);
    });
  }

  function begin(): void {
    if (running) return;
    running = true;
    lastSweep = undefined;
    lastPollAt = 0;
    void poll();
    intervalId = setIntervalImpl(() => {
      void poll();
    }, pollMs);
    openStream();
  }

  function stop(): void {
    running = false;
    if (intervalId !== null) {
      clearIntervalImpl(intervalId);
      intervalId = null;
    }
    if (stream) {
      for (const [type, listener] of streamListeners) stream.removeEventListener(type, listener);
      streamListeners = [];
      stream.close();
      stream = null;
    }
  }

  function start(): () => void {
    const doc = typeof document !== 'undefined' ? (document as DocumentWithPrerender) : undefined;
    if (doc && doc.prerendering === true) {
      const onPrerenderChange = (): void => {
        if (doc.prerendering === false) {
          doc.removeEventListener('prerenderingchange', onPrerenderChange);
          begin();
        }
      };
      doc.addEventListener('prerenderingchange', onPrerenderChange);
      return () => doc.removeEventListener('prerenderingchange', onPrerenderChange);
    }
    begin();
    return stop;
  }

  return { start, stop };
}
