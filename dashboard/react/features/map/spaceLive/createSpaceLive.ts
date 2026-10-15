import { SPACE_TICK_MS } from './consts';
import { satPosition } from './propagate';
import type { SpaceLive, SpaceLiveOptions, SpaceLiveTick } from './types';

export function createSpaceLive({ getStations, onTick, intervalMs = SPACE_TICK_MS }: SpaceLiveOptions): SpaceLive {
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    const results: SpaceLiveTick[] = [];
    for (const st of getStations() || []) {
      const pos = satPosition(st);
      if (pos) results.push({ station: st, pos });
    }
    onTick(results);
  };

  return {
    start() {
      if (timer) clearInterval(timer);
      timer = setInterval(tick, intervalMs);
      tick();
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
