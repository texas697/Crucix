import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSurfaceRoute } from '../../../../app/AppRouter/hooks/useSurfaceRoute';
import { CHANNEL_COUNT, channelAt } from '../../channels';
import { routeFromUrl, seedChannel, seedGrid } from '../../route';
import type { MediaRouteState } from '../../types';

export function useMediaRoute(): MediaRouteState {
  const { location, history } = useSurfaceRoute();
  const [channelIndex, setChannelIndex] = useState<number>(() => seedChannel(location.href));
  const [isGridOn, setIsGridOn] = useState<boolean>(() => seedGrid(location.href));
  const stateRef = useRef({ channelIndex, isGridOn });
  const hrefRef = useRef(location.href);
  const isApplyingRouteRef = useRef(false);
  const hasBootedRef = useRef(false);

  useEffect(() => {
    stateRef.current = { channelIndex, isGridOn };
  }, [channelIndex, isGridOn]);
  useEffect(() => {
    hrefRef.current = location.href;
  }, [location.href]);

  const syncUrl = useCallback((isPush: boolean, index: number, isGrid: boolean) => {
    if (isApplyingRouteRef.current) return;
    const settings = routeFromUrl(hrefRef.current)?.settings ?? '';
    history.set(['media', channelAt(index).id], { grid: isGrid ? 1 : '', settings }, { push: isPush, state: { k: 'channel' } });
  }, [history]);

  const applyRoute = useCallback((href: string, isInitial: boolean) => {
    const parsed = routeFromUrl(href);
    if (!parsed) return;
    const current = stateRef.current;
    const nextIndex = parsed.channelIndex >= 0 ? parsed.channelIndex : current.channelIndex;
    isApplyingRouteRef.current = true;
    try {
      stateRef.current = { channelIndex: nextIndex, isGridOn: parsed.isGridOn };
      setChannelIndex(nextIndex);
      setIsGridOn(parsed.isGridOn);
    } finally {
      isApplyingRouteRef.current = false;
    }
    if (isInitial) syncUrl(false, nextIndex, parsed.isGridOn);
  }, [syncUrl]);

  useEffect(() => {
    const isInitial = !hasBootedRef.current;
    hasBootedRef.current = true;
    applyRoute(location.href, isInitial);
  }, [applyRoute, location.href]);

  const onSelectChannel = useCallback((index: number) => {
    stateRef.current = { channelIndex: index, isGridOn: stateRef.current.isGridOn };
    setChannelIndex(index);
    syncUrl(true, index, stateRef.current.isGridOn);
  }, [syncUrl]);

  const onStepChannel = useCallback((delta: number) => {
    onSelectChannel((stateRef.current.channelIndex + delta + CHANNEL_COUNT) % CHANNEL_COUNT);
  }, [onSelectChannel]);

  const onToggleGrid = useCallback(() => {
    const next = !stateRef.current.isGridOn;
    stateRef.current = { channelIndex: stateRef.current.channelIndex, isGridOn: next };
    setIsGridOn(next);
    syncUrl(false, stateRef.current.channelIndex, next);
  }, [syncUrl]);

  return useMemo(
    () => ({ channelIndex, isGridOn, onSelectChannel, onStepChannel, onToggleGrid }),
    [channelIndex, isGridOn, onSelectChannel, onStepChannel, onToggleGrid],
  );
}
