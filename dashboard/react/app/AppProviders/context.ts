import { createContext } from 'react';
import type { ApiClient } from '../../api/client';
import type { SessionValue, SweepStatusValue, ThemeModeValue } from './types';

const noop = (): void => {};

export const ApiContext = createContext<ApiClient | null>(null);

export const ThemeModeContext = createContext<ThemeModeValue>({ mode: 'dark', onToggleMode: noop });

export const SessionContext = createContext<SessionValue>({
  me: null,
  isResolved: false,
  setMe: noop,
  onLogout: noop,
});

export const EMPTY_SWEEP_STATUS: SweepStatusValue = { data: null, health: null, meta: null, sweepError: null };

export const SweepStatusContext = createContext<SweepStatusValue>(EMPTY_SWEEP_STATUS);
