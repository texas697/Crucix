import type { ReactNode } from 'react';
import type { ApiClient } from '../../../../api/client';
import { SessionContext } from '../../context';
import { useSessionState } from '../../hooks/useSessionState';

export interface SessionProviderProps {
  api: ApiClient;
  children: ReactNode;
}

export function SessionProvider({ api, children }: SessionProviderProps) {
  const value = useSessionState({ api });
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
