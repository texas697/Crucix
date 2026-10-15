import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../../../../api/client';
import { isRec } from '../../coerce';
import type { AlertItem, LiveFeedIntervals, LiveFeeds, MarketItem, QuakeItem, TrackItem } from '../../types';
import { ALERTS_PATH, DEFAULT_INTERVALS, POLYMARKET_URL, QUAKES_URL, TRACKS_PATH } from './consts';
import { startWhenVisible } from './prerender';
import { reshapeAlerts, reshapeMarkets, reshapeQuakes, reshapeTracks } from './reshape';

export interface UseLiveFeedsArgs {
  api: ApiClient;
  enabled?: boolean;
  intervals?: LiveFeedIntervals;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export function useLiveFeeds({ api, enabled = true, intervals, fetchImpl = fetch, now = Date.now }: UseLiveFeedsArgs): LiveFeeds {
  const tracksMs = intervals?.tracks ?? DEFAULT_INTERVALS.tracks;
  const alertsMs = intervals?.alerts ?? DEFAULT_INTERVALS.alerts;
  const quakesMs = intervals?.quakes ?? DEFAULT_INTERVALS.quakes;
  const marketsMs = intervals?.markets ?? DEFAULT_INTERVALS.markets;

  const [tracks, setTracks] = useState<TrackItem[] | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [quakes, setQuakes] = useState<QuakeItem[] | null>(null);
  const [markets, setMarkets] = useState<MarketItem[] | null>(null);

  const nowRef = useRef(now);
  nowRef.current = now;
  const fetchRef = useRef(fetchImpl);
  fetchRef.current = fetchImpl;

  useEffect(() => {
    if (!enabled) return undefined;
    let isAlive = true;
    const ids: ReturnType<typeof setInterval>[] = [];

    const guard = (run: () => Promise<void>) => async () => {
      try {
        await run();
      } catch {
        return;
      }
    };
    const loadTracks = guard(async () => {
      const d = await api.get<unknown>(TRACKS_PATH);
      if (!isAlive || (isRec(d) && d.error)) return;
      setTracks(reshapeTracks(d));
    });
    const loadAlerts = guard(async () => {
      const d = await api.get<unknown>(ALERTS_PATH);
      if (!isAlive || (isRec(d) && d.error)) return;
      setAlerts(reshapeAlerts(d, nowRef.current()));
    });
    const loadQuakes = guard(async () => {
      const d: unknown = await (await fetchRef.current(QUAKES_URL)).json();
      if (!isAlive) return;
      setQuakes(reshapeQuakes(d));
    });
    const loadMarkets = guard(async () => {
      const d: unknown = await (await fetchRef.current(POLYMARKET_URL)).json();
      if (!isAlive) return;
      setMarkets(reshapeMarkets(d));
    });

    const start = (): void => {
      if (!isAlive) return;
      void loadTracks();
      void loadAlerts();
      void loadQuakes();
      void loadMarkets();
      ids.push(setInterval(() => void loadTracks(), tracksMs));
      ids.push(setInterval(() => void loadAlerts(), alertsMs));
      ids.push(setInterval(() => void loadQuakes(), quakesMs));
      ids.push(setInterval(() => void loadMarkets(), marketsMs));
    };
    const stopWaiting = startWhenVisible(start);

    return () => {
      isAlive = false;
      stopWaiting();
      for (const id of ids) clearInterval(id);
      ids.length = 0;
    };
  }, [api, enabled, tracksMs, alertsMs, quakesMs, marketsMs]);

  return { tracks, alerts, quakes, markets };
}

export { reshapeAlerts, reshapeMarkets, reshapeQuakes, reshapeTracks } from './reshape';
