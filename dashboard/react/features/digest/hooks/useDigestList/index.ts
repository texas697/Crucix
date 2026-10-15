import { useCallback, useMemo, useRef, useState } from 'react';
import { ApiError, type ApiClient } from '../../../../api/client';
import { statusLine, tasteTopics } from '../../format';
import type { DigestCardItem, DigestFilter, DigestListResponse, DigestListState, DigestTaste, DigestTopicCount } from '../../types';

export interface UseDigestListArgs {
  api: ApiClient;
}

const EMPTY_TASTE: DigestTaste = { likes: [], dislikes: [] };

function isUnauthenticated(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 401) return true;
  return err instanceof Error && err.message.includes('unauthenticated');
}

export function useDigestList({ api }: UseDigestListArgs): DigestListState {
  const [items, setItems] = useState<DigestCardItem[]>([]);
  const [topics, setTopics] = useState<DigestTopicCount[]>([]);
  const [taste, setTaste] = useState<DigestTaste>(EMPTY_TASTE);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const loadSeqRef = useRef(0);

  const onLoad = useCallback(async (filter: DigestFilter, topic: string, q: string) => {
    const seq = ++loadSeqRef.current;
    setStatus('LOADING…');
    setIsLoading(true);
    const params = new URLSearchParams({ filter, topic, q }).toString();
    try {
      const r = await api.get<DigestListResponse>(`/api/digest/list?${params}`);
      if (seq !== loadSeqRef.current) return;
      setItems(Array.isArray(r.items) ? r.items : []);
      setTopics(Array.isArray(r.topics) ? r.topics : []);
      setTaste({
        likes: tasteTopics(r.taste?.likes).slice(0, 6),
        dislikes: tasteTopics(r.taste?.dislikes).slice(0, 4),
      });
      setStatus(statusLine(r));
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      if (!isUnauthenticated(err)) {
        setStatus(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (seq === loadSeqRef.current) setIsLoading(false);
    }
  }, [api]);

  return useMemo(
    () => ({ items, topics, taste, status, isLoading, setItems, onLoad }),
    [items, topics, taste, status, isLoading, onLoad],
  );
}
