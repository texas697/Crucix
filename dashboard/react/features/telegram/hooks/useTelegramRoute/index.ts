import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function useTelegramRoute() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const activeChatId = id ?? null;

  const onSelectChat = useCallback((chatId: string) => {
    navigate(`/telegram/${chatId}`);
  }, [navigate]);

  return { activeChatId, onSelectChat };
}
