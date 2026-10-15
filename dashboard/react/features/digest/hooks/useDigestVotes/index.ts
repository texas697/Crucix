import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { DigestCardItem, DigestVoteActions } from '../../types';

export interface UseDigestVotesArgs {
  api: ApiClient;
  setItems: Dispatch<SetStateAction<DigestCardItem[]>>;
}

function showAlert(message: string): void {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(message);
}

export function useDigestVotes({ api, setItems }: UseDigestVotesArgs): DigestVoteActions {
  const onApplyVote = useCallback((id: string, rating: number) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, vote: rating } : a)));
  }, [setItems]);

  const onRateFromCard = useCallback((id: string, rating: number) => {
    api.post<{ rating: number }>(`/api/digest/${encodeURIComponent(id)}/feedback`, { rating })
      .then((r) => onApplyVote(id, typeof r?.rating === 'number' ? r.rating : rating))
      .catch((err: unknown) => showAlert(err instanceof Error ? err.message : String(err)));
  }, [api, onApplyVote]);

  return useMemo(() => ({ onApplyVote, onRateFromCard }), [onApplyVote, onRateFromCard]);
}
