import type { TransportOptions, TransportTimers } from './types';

export function resolveTimers({ setIntervalImpl, clearIntervalImpl }: TransportOptions): TransportTimers {
  return {
    setIntervalImpl: setIntervalImpl ?? ((handler, timeout) => setInterval(handler, timeout)),
    clearIntervalImpl:
      clearIntervalImpl ??
      ((id) => {
        clearInterval(id as ReturnType<typeof setInterval>);
      }),
  };
}
