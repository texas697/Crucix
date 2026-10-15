import { useCallback, useEffect, useState } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { TelegramDialog } from '../../types';

interface DialogsResponse {
  dialogs: TelegramDialog[];
}

export function useTelegramDialogs(api: ApiClient, enabled: boolean) {
  const [dialogs, setDialogs] = useState<TelegramDialog[]>([]);
  const [isLoadingDialogs, setIsLoadingDialogs] = useState<boolean>(false);

  const fetchDialogs = useCallback(() => {
    if (!enabled) return;
    setIsLoadingDialogs(true);
    api.get<DialogsResponse>('/api/telegram/dialogs')
      .then((res: DialogsResponse) => {
        setDialogs(res?.dialogs || []);
      })
      .catch(() => {
        setDialogs([]);
      })
      .finally(() => {
        setIsLoadingDialogs(false);
      });
  }, [api, enabled]);

  useEffect(() => {
    fetchDialogs();
  }, [fetchDialogs]);

  return { dialogs, isLoadingDialogs, onRefreshDialogs: fetchDialogs };
}
