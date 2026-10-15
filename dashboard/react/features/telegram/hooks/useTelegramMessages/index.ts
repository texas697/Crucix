import { useCallback, useEffect, useState } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { TelegramMessage } from '../../types';

interface MessagesResponse {
  messages: TelegramMessage[];
}

export function useTelegramMessages(api: ApiClient, chatId: string | null) {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  const fetchMessages = useCallback(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    api.get<MessagesResponse>(`/api/telegram/messages/${chatId}`)
      .then((res: MessagesResponse) => {
        setMessages(res?.messages || []);
      })
      .catch(() => {
        setMessages([]);
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });
  }, [api, chatId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return { messages, isLoadingMessages, onRefreshMessages: fetchMessages };
}
