import { useEffect } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { Article, ResearchState } from '../../types';
import { articlePath } from '../../utils';

export interface UseResearchPollArgs {
  api: ApiClient;
  article: Article | null;
  isOpen: boolean;
  pollMs: number;
  setArticle: React.Dispatch<React.SetStateAction<Article | null>>;
}

const POLL_FAILED: ResearchState = { state: 'error', error: 'research poll failed' };

export function useResearchPoll({ api, article, isOpen, pollMs, setArticle }: UseResearchPollArgs): void {
  const researchState = article?.research?.state;
  const articleId = article?.id ?? null;

  useEffect(() => {
    if (!isOpen || researchState !== 'running' || !articleId) return;
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const applyResearch = (research: ResearchState) => {
      setArticle((cur) => (cur && cur.id === articleId ? { ...cur, research } : cur));
    };
    const tick = async () => {
      try {
        const research = await api.get<ResearchState>(articlePath(articleId, '/research'));
        if (isCancelled) return;
        applyResearch(research);
        if (research.state === 'running') timer = setTimeout(tick, pollMs);
      } catch {
        if (isCancelled) return;
        applyResearch(POLL_FAILED);
      }
    };
    timer = setTimeout(tick, pollMs);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, researchState, articleId, api, pollMs, setArticle]);
}
