import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { Article, ReaderLoadState, ReaderStatus } from '../../types';
import { errorText } from '../../utils';

export interface UseReaderLoadArgs {
  api: ApiClient;
  id: string | null;
  url: string | null;
  isOpen: boolean;
  onResolved?: (id: string, url?: string | null) => void;
}

export function useReaderLoad({ api, id, url, isOpen, onResolved }: UseReaderLoadArgs): ReaderLoadState {
  const [article, setArticle] = useState<Article | null>(null);
  const [status, setStatus] = useState<ReaderStatus>('idle');
  const [error, setError] = useState('');
  const seqRef = useRef(0);
  const onResolvedRef = useRef(onResolved);
  const apiRef = useRef(api);

  useEffect(() => {
    onResolvedRef.current = onResolved;
    apiRef.current = api;
  }, [onResolved, api]);

  useEffect(() => {
    if (!isOpen) {
      seqRef.current += 1;
      return;
    }
    const seq = ++seqRef.current;
    setStatus('loading');
    setError('');
    setArticle({ id, url, title: undefined, vote: 0 });
    const load = async () => {
      try {
        const loaded = id
          ? await apiRef.current.get<Article>(`/api/digest/article/${encodeURIComponent(id)}`)
          : await apiRef.current.post<Article>('/api/digest/open', { url, title: undefined, source: undefined });
        if (seq !== seqRef.current) return;
        setArticle(loaded);
        setStatus('idle');
        if (!id && loaded.id) onResolvedRef.current?.(loaded.id, url ?? loaded.url ?? null);
      } catch (err) {
        if (seq !== seqRef.current) return;
        setStatus('error');
        setError(errorText(err, 'Could not load the article'));
      }
    };
    void load();
  }, [id, url, isOpen]);

  return { article, status, error, setArticle, setError };
}
