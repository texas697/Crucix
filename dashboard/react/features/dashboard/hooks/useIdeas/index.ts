import { useCallback, useMemo, useState } from 'react';
import type { ApiClient } from '../../../../api/client';
import type { SweepData, UserProfile } from '../../../../api/types';
import type { IdeasPayload } from '../../types';
import type { IdeasState } from '../../stateTypes';

export interface UseIdeasArgs {
  api: ApiClient;
  me: UserProfile | null;
  data: SweepData | null;
  onOpenSettings: () => void;
}

export function useIdeas({ api, me, data, onOpenSettings }: UseIdeasArgs): IdeasState {
  const [myIdeas, setMyIdeas] = useState<IdeasPayload | null>(null);

  const onGenerateIdeas = useCallback(() => {
    if (!me?.llm) {
      onOpenSettings();
      return;
    }
    api.post<IdeasPayload>('/api/ideas').then(setMyIdeas).catch(() => undefined);
  }, [me, api, onOpenSettings]);

  const panelData = useMemo<SweepData | null>(() => {
    if (!data) return null;
    if (myIdeas?.ideas?.length) {
      return { ...data, ideas: myIdeas.ideas, ideasSource: 'mine', ideasMeta: myIdeas } as SweepData;
    }
    return data;
  }, [data, myIdeas]);

  return useMemo(() => ({ panelData, onGenerateIdeas }), [panelData, onGenerateIdeas]);
}
