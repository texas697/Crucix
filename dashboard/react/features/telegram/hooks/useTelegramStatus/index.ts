import { useEffect, useState } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { TelegramStatus } from '../../types';

export function useTelegramStatus(api: ApiClient) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    api.get<TelegramStatus>('/api/telegram/status')
      .then((data: TelegramStatus) => {
        if (active) {
          setStatus(data);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setStatus({ configured: false, authenticated: false, connected: false, error: err.message });
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [api]);

  return { status, isLoading };
}
