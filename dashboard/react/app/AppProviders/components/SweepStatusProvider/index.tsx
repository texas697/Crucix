import type { ReactNode } from 'react';
import type { ApiClient } from '../../../../api/client';
import { SweepStatusContext } from '../../context';
import { useSweepTransport } from '../../hooks/useSweepTransport';

export interface SweepStatusProviderProps {
  api: ApiClient;
  children: ReactNode;
}

export function SweepStatusProvider({ api, children }: SweepStatusProviderProps) {
  const value = useSweepTransport({ api });
  return <SweepStatusContext.Provider value={value}>{children}</SweepStatusContext.Provider>;
}
