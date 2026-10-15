import { afterEach, describe, expect, it, vi } from 'vitest';
import minimal from '../fixtures/synthesized/minimal.json';
import partial from '../fixtures/synthesized/partial.json';
import { assertSweepData, isHealth, isSweepData, parseSweep } from '../../dashboard/react/api/guards';
import { ApiError, createApiClient, type ApiClient } from '../../dashboard/react/api/client';
import { createTransport, shouldUseSse } from '../../dashboard/react/api/transport';
import type { HealthResponse } from '../../dashboard/react/api/types';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const okClient = (body: unknown) => createApiClient({ fetchImpl: async () => jsonResponse(200, body) });

describe('guards', () => {
  it('accepts the minimal synthesized fixture', () => {
    expect(isSweepData(minimal)).toBe(true);
  });

  it('accepts the partial fixture (some optional sources missing/disabled)', () => {
    expect(isSweepData(partial)).toBe(true);
  });

  it('rejects a wrong envelope and hostile input', () => {
    expect(isSweepData({})).toBe(false);
    expect(isSweepData(null)).toBe(false);
    expect(isSweepData([])).toBe(false);
    expect(isSweepData('x')).toBe(false);
    expect(isSweepData({ meta: null })).toBe(false);
    expect(isSweepData({ meta: {} })).toBe(false);
    expect(isSweepData({ meta: { timestamp: 42 } })).toBe(false);
    expect(isSweepData({ meta: { timestamp: null } })).toBe(true);
  });

  it('asserts and parses', () => {
    expect(() => assertSweepData({})).toThrow(/meta/);
    const parsed = parseSweep(minimal);
    expect(parsed.meta.version).toBe('2.0.0');
  });

  it('checks health by string status', () => {
    expect(isHealth({ status: 'ok' })).toBe(true);
    expect(isHealth({})).toBe(false);
    expect(isHealth(null)).toBe(false);
  });
});

describe('client', () => {
  it('resolves parsed JSON for a 200 response', async () => {
    await expect(okClient({ hello: 'world' }).get('/api/x')).resolves.toEqual({ hello: 'world' });
  });

  it('maps 401 to session-expired', async () => {
    const client = createApiClient({ fetchImpl: async () => jsonResponse(401, { error: 'unauthorized' }) });
    await expect(client.get('/api/me')).rejects.toMatchObject({ kind: 'session-expired', status: 401 });
  });

  it('maps 404 to not-found (auth-off /api/me is local mode, not logout)', async () => {
    const client = createApiClient({ fetchImpl: async () => jsonResponse(404, { error: 'not found' }) });
    await expect(client.get('/api/me')).rejects.toMatchObject({ kind: 'not-found', status: 404 });
  });

  it('maps 429 to rate-limited', async () => {
    const client = createApiClient({ fetchImpl: async () => jsonResponse(429, { error: 'slow down' }) });
    await expect(client.get('/api/x')).rejects.toMatchObject({ kind: 'rate-limited', status: 429 });
  });

  it('maps 503 to starting', async () => {
    const client = createApiClient({ fetchImpl: async () => jsonResponse(503, { error: 'no data yet' }) });
    await expect(client.get('/api/data')).rejects.toMatchObject({ kind: 'starting', status: 503 });
  });

  it('maps a 400 "No LLM" body to no-llm', async () => {
    const client = createApiClient({ fetchImpl: async () => jsonResponse(400, { error: 'No LLM configured' }) });
    await expect(client.post('/api/ideas')).rejects.toMatchObject({ kind: 'no-llm', status: 400 });
  });

  it('maps a 402 shared-budget body to budget', async () => {
    const client = createApiClient({ fetchImpl: async () => jsonResponse(402, { budget: 'shared' }) });
    await expect(client.post('/api/ideas')).rejects.toMatchObject({ kind: 'budget', status: 402 });
  });

  it('maps malformed JSON on a 200 to parse', async () => {
    const client = createApiClient({ fetchImpl: async () => new Response('not-json', { status: 200 }) });
    await expect(client.get('/api/x')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('maps a thrown fetch to network', async () => {
    const client = createApiClient({
      fetchImpl: async () => {
        throw new Error('boom');
      },
    });
    await expect(client.get('/api/x')).rejects.toMatchObject({ kind: 'network', status: 0 });
  });

  it('does not log request bodies or headers', async () => {
    const spies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'debug'),
    ];
    try {
      const client = createApiClient({ fetchImpl: async () => jsonResponse(200, { ok: true }) });
      await client.post('/api/x', { secret: 'value' });
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('throws ApiError instances', async () => {
    const client = createApiClient({ fetchImpl: async () => jsonResponse(403, { error: 'nope' }) });
    await expect(client.get('/api/x')).rejects.toBeInstanceOf(ApiError);
  });
});

interface FakeTimers {
  size: () => number;
  timeouts: () => number[];
  fire: () => void;
  setIntervalImpl: (handler: () => void, timeout: number) => unknown;
  clearIntervalImpl: (id: unknown) => void;
}

function makeTimers(): FakeTimers {
  const timers = new Map<number, { handler: () => void; timeout: number }>();
  let next = 1;
  return {
    size: () => timers.size,
    timeouts: () => [...timers.values()].map((t) => t.timeout),
    fire: () => {
      for (const { handler } of [...timers.values()]) handler();
    },
    setIntervalImpl: (handler, timeout) => {
      const id = next++;
      timers.set(id, { handler, timeout });
      return id;
    },
    clearIntervalImpl: (id) => {
      timers.delete(id as number);
    },
  };
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  closed = false;
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const set = this.listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event as Event);
  }
}

function fakeClient(get: (path: string) => Promise<unknown>): ApiClient {
  return { get, post: vi.fn(), put: vi.fn(), del: vi.fn(), request: vi.fn() } as unknown as ApiClient;
}

const HEALTH: HealthResponse = {
  status: 'ok',
  uptime: 1,
  lastSweep: '2026-10-14T11:00:00.000Z',
  nextSweep: null,
  sweepInProgress: false,
  sweepStartedAt: null,
  sourcesOk: 21,
  sourcesFailed: 0,
  llmEnabled: false,
  llmProvider: null,
  authEnabled: false,
  byokEnabled: false,
  sweepMode: 'auto',
  refreshIntervalMinutes: 60,
  language: 'en',
};

afterEach(() => {
  FakeEventSource.instances = [];
  vi.restoreAllMocks();
});

describe('transport', () => {
  it('polls health on start and fetches /api/data when lastSweep changes', async () => {
    const get = vi.fn(async (path: string) => (path === '/api/health' ? HEALTH : minimal));
    const onData = vi.fn();
    const onHealth = vi.fn();
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(get),
      onData,
      onHealth,
      sseEnabled: false,
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
      now: () => 1,
    });

    transport.start();
    await vi.waitFor(() => expect(get).toHaveBeenCalledWith('/api/health'));
    await vi.waitFor(() => expect(get).toHaveBeenCalledWith('/api/data'));
    expect(onHealth).toHaveBeenCalledWith(HEALTH);
    expect(onData).toHaveBeenCalledWith(minimal);
    transport.stop();
  });

  it('calls onSessionExpired when the health poll returns 401', async () => {
    const get = vi.fn(async (path: string) => {
      if (path === '/api/health') throw new ApiError('session-expired', 401, 'expired');
      return minimal;
    });
    const onSessionExpired = vi.fn();
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(get),
      onData: vi.fn(),
      onSessionExpired,
      sseEnabled: false,
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
      now: () => 1,
    });

    transport.start();
    await vi.waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    // A 401 stops the poll.
    expect(timers.size()).toBe(0);
  });

  it('clears the interval and closes the stream on stop', async () => {
    const get = vi.fn(async (path: string) => (path === '/api/health' ? HEALTH : minimal));
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(get),
      onData: vi.fn(),
      sseEnabled: true,
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
      now: () => 1,
    });

    transport.start();
    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    expect(timers.size()).toBe(1);

    transport.stop();
    expect(timers.size()).toBe(0);
    expect(FakeEventSource.instances[0]?.closed).toBe(true);
  });

  it('start/stop/start does not accumulate timers or streams', async () => {
    const get = vi.fn(async (path: string) => (path === '/api/health' ? HEALTH : minimal));
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(get),
      onData: vi.fn(),
      sseEnabled: true,
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
      now: () => 1,
    });

    transport.start();
    transport.stop();
    transport.start();
    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
    expect(timers.size()).toBe(1);

    transport.stop();
    expect(timers.size()).toBe(0);
    expect(FakeEventSource.instances.every((es) => es.closed)).toBe(true);
  });

  it('never opens a stream when sseEnabled is false', async () => {
    const get = vi.fn(async (path: string) => (path === '/api/health' ? HEALTH : minimal));
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(get),
      onData: vi.fn(),
      sseEnabled: false,
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
      now: () => 1,
    });

    transport.start();
    await vi.waitFor(() => expect(get).toHaveBeenCalled());
    expect(FakeEventSource.instances).toHaveLength(0);
    transport.stop();
  });

  it('retries /api/data every 5 s while the server answers 503 starting', async () => {
    let isReady = false;
    const get = vi.fn(async (path: string) => {
      if (path === '/api/health') return { ...HEALTH, lastSweep: null };
      if (!isReady) throw new ApiError('starting', 503, 'No data yet');
      return minimal;
    });
    const onData = vi.fn();
    const onSweepError = vi.fn();
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(get),
      onData,
      onSweepError,
      sseEnabled: false,
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
      now: () => 1,
    });

    transport.start();
    await vi.waitFor(() => expect(timers.timeouts()).toEqual([60000, 5000]));
    expect(onSweepError).not.toHaveBeenCalled();
    const dataCallsBefore = get.mock.calls.filter(([path]) => path === '/api/data').length;

    timers.fire();
    await vi.waitFor(() => expect(get.mock.calls.filter(([path]) => path === '/api/data').length).toBeGreaterThan(dataCallsBefore));
    expect(onData).not.toHaveBeenCalled();
    expect(timers.timeouts()).toEqual([60000, 5000]);

    isReady = true;
    timers.fire();
    await vi.waitFor(() => expect(onData).toHaveBeenCalledWith(minimal));
    expect(timers.timeouts()).toEqual([60000]);
    transport.stop();
    expect(timers.size()).toBe(0);
  });

  it('refetches /api/data on an SSE connected frame while starting', async () => {
    let isReady = false;
    const get = vi.fn(async (path: string) => {
      if (path === '/api/health') return { ...HEALTH, lastSweep: null };
      if (!isReady) throw new ApiError('starting', 503, 'No data yet');
      return minimal;
    });
    const onData = vi.fn();
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(get),
      onData,
      sseEnabled: true,
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
      now: () => 1,
    });

    transport.start();
    await vi.waitFor(() => expect(timers.timeouts()).toEqual([60000, 5000]));
    isReady = true;
    FakeEventSource.instances[0]?.emit('message', { data: '{"type":"connected"}' });
    await vi.waitFor(() => expect(onData).toHaveBeenCalledWith(minimal));
    expect(timers.timeouts()).toEqual([60000]);
    transport.stop();
  });

  it('applies update frames sent as unnamed SSE messages and as named events', async () => {
    const get = vi.fn(async (path: string) => (path === '/api/health' ? HEALTH : minimal));
    const onData = vi.fn();
    const onSweepError = vi.fn();
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(get),
      onData,
      onSweepError,
      sseEnabled: true,
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
      now: () => 1,
    });

    transport.start();
    await vi.waitFor(() => expect(onData).toHaveBeenCalledWith(minimal));
    const stream = FakeEventSource.instances[0];
    stream?.emit('message', { data: JSON.stringify({ type: 'update', data: partial }) });
    expect(onData).toHaveBeenLastCalledWith(partial);
    stream?.emit('update', { data: JSON.stringify({ type: 'update', data: minimal }) });
    expect(onData).toHaveBeenLastCalledWith(minimal);
    stream?.emit('message', { data: 'not json' });
    stream?.emit('message', { data: JSON.stringify({ type: 'sweep_error', error: 'boom' }) });
    expect(onSweepError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    expect(onData).toHaveBeenCalledTimes(3);
    transport.stop();
  });

  it('stops is safe on a never-started transport', () => {
    const timers = makeTimers();
    const transport = createTransport({
      client: fakeClient(async () => minimal),
      onData: vi.fn(),
      setIntervalImpl: timers.setIntervalImpl,
      clearIntervalImpl: timers.clearIntervalImpl,
    });
    expect(() => transport.stop()).not.toThrow();
  });
});

describe('shouldUseSse', () => {
  it('is true only for localhost/127.0.0.1/.run.app hosts', () => {
    expect(shouldUseSse('localhost')).toBe(true);
    expect(shouldUseSse('127.0.0.1')).toBe(true);
    expect(shouldUseSse('crucix-abc-uc.a.run.app')).toBe(true);
    // Non-localhost, non-run.app hosts must fall back to polling only.
    expect(shouldUseSse('example.com')).toBe(false);
    expect(shouldUseSse('dashboard.crucix.live')).toBe(false);
    expect(shouldUseSse('')).toBe(false);
  });
});
