import { useMemo } from 'react';
import { createApiClient } from '../../api/client';
import { ApiContext } from './context';
import { SessionProvider } from './components/SessionProvider';
import { SweepStatusProvider } from './components/SweepStatusProvider';
import { ThemeModeProvider } from './components/ThemeModeProvider';
import type { AppProvidersProps } from './types';

export function AppProviders({ children, api, storage, hasSession = true }: AppProvidersProps) {
  const client = useMemo(() => api ?? createApiClient(), [api]);

  const content = hasSession
    ? (
      <SessionProvider api={client}>
        <SweepStatusProvider api={client}>{children}</SweepStatusProvider>
      </SessionProvider>
    )
    : children;

  return (
    <ApiContext.Provider value={client}>
      <ThemeModeProvider storage={storage}>{content}</ThemeModeProvider>
    </ApiContext.Provider>
  );
}

export { useApi } from './hooks/useApi';
export { useSession } from './hooks/useSession';
export { useSweepStatus } from './hooks/useSweepStatus';
export { useThemeMode } from './hooks/useThemeMode';
export type { AppProvidersProps, SessionValue, SweepStatusValue, ThemeModeValue } from './types';
