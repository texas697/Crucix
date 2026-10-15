import { useEffect, useMemo, useState } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { HealthResponse, SweepData } from '../../../../api/types';
import { createTransport, shouldUseSse } from '../../../../api/transport';
import { locationHostname, redirectToLogin } from '../../utils';
import type { SweepStatusValue } from '../../types';

export interface UseSweepTransportArgs {
  api: ApiClient;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function useSweepTransport({ api }: UseSweepTransportArgs): SweepStatusValue {
  const [data, setData] = useState<SweepData | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);

  useEffect(() => {
    const transport = createTransport({
      client: api,
      onData: setData,
      onHealth: setHealth,
      onSweepError: (err) => setSweepError(errorMessage(err)),
      onSessionExpired: () => redirectToLogin('expired'),
      sseEnabled: shouldUseSse(locationHostname()),
    });
    const stop = transport.start();
    return () => {
      stop();
      transport.stop();
    };
  }, [api]);

  return useMemo(
    () => ({ data, health, meta: data?.meta ?? null, sweepError }),
    [data, health, sweepError],
  );
}
