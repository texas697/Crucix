import type { ReactNode } from 'react';
import type { ApiClient } from '../../api/client';
import type { HealthResponse, SweepData, SweepMeta, UserProfile } from '../../api/types';
import type { StorageLike, Theme } from '../../shared/theme';

export interface ThemeModeValue {
  mode: Theme;
  onToggleMode: () => void;
}

export interface SessionValue {
  me: UserProfile | null;
  isResolved: boolean;
  setMe: (me: UserProfile | null) => void;
  onLogout: () => void;
}

export interface SweepStatusValue {
  data: SweepData | null;
  health: HealthResponse | null;
  meta: SweepMeta | null;
  sweepError: string | null;
}

export interface AppProvidersProps {
  children: ReactNode;
  api?: ApiClient;
  storage?: StorageLike | null;
  hasSession?: boolean;
}
