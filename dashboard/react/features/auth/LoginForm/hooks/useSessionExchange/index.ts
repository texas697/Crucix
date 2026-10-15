import { useCallback } from 'react';
import type { ApiClient } from '../../../../../api/client';
import type { FirebaseAdapter, FirebaseUserLike } from '../../../firebase';
import { safeNext } from '../../../safeNext';
import { MESSAGES } from '../../consts';
import { postSession } from '../../session';
import type { EstablishSession, LoginMessage } from '../../types';
import { currentOrigin, replaceLocation } from '../../utils';

export interface UseSessionExchangeArgs {
  adapter: FirebaseAdapter;
  api?: ApiClient;
  next: string;
  navigate?: (href: string) => void;
  onSession: (user: unknown) => void;
  setMessage: (message: LoginMessage) => void;
}

export function useSessionExchange({
  adapter, api, next, navigate, onSession, setMessage,
}: UseSessionExchangeArgs): EstablishSession {
  const onNavigate = useCallback(
    (href: string) => {
      if (navigate) navigate(href);
      else replaceLocation(href);
    },
    [navigate],
  );

  return useCallback(
    async (user: FirebaseUserLike) => {
      const idToken = await user.getIdToken(true);
      await postSession({ api, idToken });
      await adapter.signOut().catch(() => undefined);
      setMessage(MESSAGES.granted);
      onSession(user);
      onNavigate(safeNext(next, currentOrigin()));
    },
    [adapter, api, next, onNavigate, onSession, setMessage],
  );
}
