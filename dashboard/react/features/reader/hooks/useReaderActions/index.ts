import { useCallback, useMemo, useRef } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { Article, ReaderActions, ReaderLoadState } from '../../types';
import { articlePath, errorText } from '../../utils';

export interface UseReaderActionsArgs {
  api: ApiClient;
  load: ReaderLoadState;
  onVote?: (id: string, rating: number) => void;
}

export function useReaderActions({ api, load, onVote: onHostVote }: UseReaderActionsArgs): ReaderActions {
  const busyRef = useRef(false);
  const { setArticle, setError } = load;
  const articleId = load.article?.id ?? null;

  const onVote = useCallback(async (rating: number) => {
    if (!articleId) return;
    try {
      const result = await api.post<{ rating: number }>(articlePath(articleId, '/feedback'), { rating });
      setArticle((cur) => (cur ? { ...cur, vote: result.rating } : cur));
      onHostVote?.(articleId, result.rating);
    } catch {
      return;
    }
  }, [articleId, api, setArticle, onHostVote]);

  const onSummarize = useCallback(async () => {
    if (!articleId || busyRef.current) return;
    busyRef.current = true;
    try {
      const updated = await api.post<Article>(articlePath(articleId, '/summarize'));
      setArticle((cur) => (cur && cur.id === articleId ? { ...cur, ...updated } : cur));
    } catch (err) {
      setError(errorText(err, 'Write-up failed'));
    } finally {
      busyRef.current = false;
    }
  }, [articleId, api, setArticle, setError]);

  const onResearch = useCallback(async () => {
    if (!articleId || busyRef.current) return;
    busyRef.current = true;
    setArticle((cur) => (cur ? { ...cur, research: { state: 'running', stage: 'searching', progress: 3 } } : cur));
    try {
      await api.post(articlePath(articleId, '/research'));
    } catch (err) {
      const research = { state: 'error' as const, error: errorText(err, 'failed') };
      setArticle((cur) => (cur && cur.id === articleId ? { ...cur, research } : cur));
    } finally {
      busyRef.current = false;
    }
  }, [articleId, api, setArticle]);

  return useMemo(() => ({ onVote, onSummarize, onResearch }), [onVote, onSummarize, onResearch]);
}
