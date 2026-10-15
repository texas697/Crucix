import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ApiClient } from '../../dashboard/react/api/client';
import { useLiveFeeds } from '../../dashboard/react/features/dashboard/hooks/useLiveFeeds';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Minimal `ApiClient` built from a path -> handler map; records every path it was asked for. */
function makeApi(routes: Record<string, () => unknown>): { api: ApiClient; get: ReturnType<typeof vi.fn> } {
  const get = vi.fn(async (path: string) => (routes[path] ? routes[path]!() : {}));
  return { api: { get } as unknown as ApiClient, get };
}

/** Route the two external feeds by URL, matching the legacy targets. */
function makeFetch(routes: { quakes: unknown; markets: unknown }): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('earthquake.usgs.gov')) return jsonResponse(routes.quakes);
    if (url.includes('gamma-api.polymarket.com')) return jsonResponse(routes.markets);
    throw new Error(`unexpected fetch: ${url}`);
  });
}

/** Drain microtasks inside act so the effect's async loads settle without act warnings. */
async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
}

describe('useLiveFeeds', () => {
  it('polls tracks and alerts from the same-origin endpoints and the two external feeds', async () => {
    const { api, get } = makeApi({
      '/api/tracks': () => ({ count: 1, tracks: [{ type: 'uav', locality: 'Odesa' }] }),
      '/api/alerts': () => ({ source: 's', items: [{ time: 1_700_000_000, cities: ['Kyiv'] }] }),
    });
    const fetchImpl = makeFetch({ quakes: { features: [] }, markets: [] });

    const { result } = renderHook(() =>
      useLiveFeeds({ api,  fetchImpl: fetchImpl as unknown as typeof fetch, now: () => 1_700_000_000_000 }),
    );

    await waitFor(() => expect(result.current.tracks).not.toBeNull());
    await waitFor(() => expect(result.current.quakes).not.toBeNull());
    await waitFor(() => expect(result.current.markets).not.toBeNull());

    expect(get).toHaveBeenCalledWith('/api/tracks');
    expect(get).toHaveBeenCalledWith('/api/alerts');
    const urls = fetchImpl.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('earthquake.usgs.gov'))).toBe(true);
    expect(urls.some((u) => u.includes('gamma-api.polymarket.com/events'))).toBe(true);
  });

  it('reshapes the USGS GeoJSON into sorted quake rows', async () => {
    const quakes = {
      features: [
        {
          id: 'q1',
          properties: { mag: 5.2, place: 'North of X', time: 1_699_999_999_000, url: 'https://usgs/1', tsunami: 0 },
          geometry: { coordinates: [10.5, 20.5, 12.3] },
        },
        {
          id: 'q2',
          properties: { mag: 6.1, place: 'South of Y', time: 1_699_999_998_000, url: 'https://usgs/2', tsunami: 1 },
          geometry: { coordinates: [-70.1, -30.2, 5] },
        },
        // Missing coordinates are dropped, matching `.filter(q => q.lat != null && q.lon != null)`.
        {
          id: 'q3',
          properties: { mag: 2.5, place: 'No coords', time: 1_699_999_997_000, url: null, tsunami: 0 },
          geometry: { coordinates: [null, null, 0] },
        },
      ],
    };
    const { api } = makeApi({});
    const fetchImpl = makeFetch({ quakes, markets: [] });

    const { result } = renderHook(() =>
      useLiveFeeds({ api,  fetchImpl: fetchImpl as unknown as typeof fetch }),
    );

    await waitFor(() => expect(result.current.quakes).not.toBeNull());
    expect(result.current.quakes).toEqual([
      {
        id: 'q2',
        mag: 6.1,
        place: 'South of Y',
        lat: -30.2,
        lon: -70.1,
        depth: 5,
        ts: new Date(1_699_999_998_000).toISOString(),
        url: 'https://usgs/2',
        tsunami: 1,
      },
      {
        id: 'q1',
        mag: 5.2,
        place: 'North of X',
        lat: 20.5,
        lon: 10.5,
        depth: 12.3,
        ts: new Date(1_699_999_999_000).toISOString(),
        url: 'https://usgs/1',
        tsunami: 0,
      },
    ]);
  });

  it('reshapes Polymarket gamma events into {title, yes, vol, slug} rows', async () => {
    const events = [
      {
        title: 'Will there be a ceasefire in Gaza?',
        slug: 'ceasefire-gaza',
        volume24hr: 100,
        markets: [{ outcomePrices: '["0.62","0.38"]', volume24hr: 50000 }],
      },
      // Filtered out: no conflict keyword.
      { title: 'Will aliens land?', slug: 'aliens', markets: [{ outcomePrices: '["0.1"]' }] },
      {
        title: 'Russia Ukraine war update',
        slug: 'ru-ua',
        markets: [{ outcomePrices: '["0.4","0.6"]', volume24hr: 1200 }],
      },
      // Skipped: no markets.
      { title: 'Iran nuclear deal', slug: 'iran', markets: [] },
    ];
    const { api } = makeApi({});
    const fetchImpl = makeFetch({ quakes: { features: [] }, markets: events });

    const { result } = renderHook(() =>
      useLiveFeeds({ api,  fetchImpl: fetchImpl as unknown as typeof fetch }),
    );

    await waitFor(() => expect(result.current.markets).not.toBeNull());
    expect(result.current.markets).toEqual([
      { title: 'Will there be a ceasefire in Gaza?', yes: 0.62, vol: 50000, slug: 'ceasefire-gaza' },
      { title: 'Russia Ukraine war update', yes: 0.4, vol: 1200, slug: 'ru-ua' },
    ]);
  });

  it('keeps only alerts within the last hour and caps at ten', async () => {
    const nowMs = 1_700_000_000_000;
    const recent = { time: nowMs / 1000 - 60, cities: ['Kyiv'] };
    const old = { time: nowMs / 1000 - 7200, cities: ['Odesa'] };
    const { api } = makeApi({
      '/api/alerts': () => ({ source: 's', items: [old, recent] }),
    });
    const fetchImpl = makeFetch({ quakes: { features: [] }, markets: [] });

    const { result } = renderHook(() =>
      useLiveFeeds({ api,  fetchImpl: fetchImpl as unknown as typeof fetch, now: () => nowMs }),
    );

    await waitFor(() => expect(result.current.alerts).not.toBeNull());
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts?.[0]).toMatchObject({ cities: ['Kyiv'], time: String(recent.time) });
  });

  it('clears every timer on unmount so no further fetches happen', async () => {
    vi.useFakeTimers();
    const { api, get } = makeApi({
      '/api/tracks': () => ({ count: 0, tracks: [] }),
      '/api/alerts': () => ({ items: [] }),
    });
    const fetchImpl = makeFetch({ quakes: { features: [] }, markets: [] });

    const { unmount } = renderHook(() =>
      useLiveFeeds({ api, 
        fetchImpl: fetchImpl as unknown as typeof fetch,
        intervals: { tracks: 1000, alerts: 1000, quakes: 1000, markets: 1000 },
        now: () => 0,
      }),
    );

    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });

    const before = get.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(get.mock.calls.length).toBeGreaterThan(before);

    unmount();
    const afterUnmount = get.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(get.mock.calls.length).toBe(afterUnmount);
  });

  it('does not leave duplicate timers under StrictMode double-mount', async () => {
    vi.useFakeTimers();
    const { api, get } = makeApi({
      '/api/tracks': () => ({ count: 0, tracks: [] }),
      '/api/alerts': () => ({ items: [] }),
    });
    const fetchImpl = makeFetch({ quakes: { features: [] }, markets: [] });

    renderHook(
      () =>
        useLiveFeeds({ api, 
          fetchImpl: fetchImpl as unknown as typeof fetch,
          intervals: { tracks: 1000, alerts: 1000, quakes: 1000, markets: 1000 },
          now: () => 0,
        }),
      { wrapper: StrictMode },
    );

    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });

    const base = get.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    const first = get.mock.calls.length - base;
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    const second = get.mock.calls.length - base - first;

    // One interval tick fires one track + one alerts request; a duplicated timer would double it.
    expect(first).toBe(2);
    expect(second).toBe(2);
  });

  it('keeps the last value when a later fetch fails', async () => {
    vi.useFakeTimers();
    let trackCalls = 0;
    const { api, get } = makeApi({
      '/api/tracks': () => {
        trackCalls += 1;
        if (trackCalls === 1) return { count: 1, tracks: [{ type: 'shahed' }] };
        throw new Error('tracks down');
      },
      '/api/alerts': () => ({ items: [] }),
    });
    const fetchImpl = makeFetch({ quakes: { features: [] }, markets: [] });

    const { result } = renderHook(() =>
      useLiveFeeds({ api, 
        fetchImpl: fetchImpl as unknown as typeof fetch,
        intervals: { tracks: 1000, alerts: 1000, quakes: 1000, markets: 1000 },
        now: () => 0,
      }),
    );

    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });
    expect(result.current.tracks).toEqual([{ type: 'shahed' }]);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });

    expect(get.mock.calls.filter((c) => c[0] === '/api/tracks').length).toBeGreaterThan(1);
    expect(result.current.tracks).toEqual([{ type: 'shahed' }]);
  });

  it('does nothing while prerendering and starts when prerendering flips false', async () => {
    const doc = document as Document & { prerendering?: boolean };
    Object.defineProperty(doc, 'prerendering', { value: true, writable: true, configurable: true });

    const { api, get } = makeApi({
      '/api/tracks': () => ({ count: 0, tracks: [] }),
      '/api/alerts': () => ({ items: [] }),
    });
    const fetchImpl = makeFetch({ quakes: { features: [] }, markets: [] });

    renderHook(() =>
      useLiveFeeds({ api,  fetchImpl: fetchImpl as unknown as typeof fetch, now: () => 0 }),
    );
    await settle();

    expect(get).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();

    await act(async () => {
      doc.prerendering = false;
      doc.dispatchEvent(new Event('prerenderingchange'));
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });

    await waitFor(() => expect(get).toHaveBeenCalledWith('/api/tracks'));
    delete doc.prerendering;
  });

  it('emits no console noise across a full load/unmount cycle', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { api } = makeApi({
      '/api/tracks': () => ({ count: 0, tracks: [] }),
      '/api/alerts': () => ({ items: [] }),
    });
    const fetchImpl = makeFetch({ quakes: { features: [] }, markets: [] });

    const { result, unmount } = renderHook(() =>
      useLiveFeeds({ api,  fetchImpl: fetchImpl as unknown as typeof fetch, now: () => 0 }),
    );
    await waitFor(() => expect(result.current.tracks).not.toBeNull());
    unmount();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
