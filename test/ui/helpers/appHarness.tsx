import type { ReactNode } from 'react';
import { vi } from 'vitest';
import {
  MemoryRouter, useLocation, useNavigate, useNavigationType,
  type Location, type NavigateFunction, type NavigationType,
} from 'react-router-dom';
import type { ApiClient } from '../../../dashboard/react/api/client';
import type { UserProfile } from '../../../dashboard/react/api/types';
import { ThemeModeProvider } from '../../../dashboard/react/app/AppProviders/components/ThemeModeProvider';
import { SweepStatusProvider } from '../../../dashboard/react/app/AppProviders/components/SweepStatusProvider';
import {
  ApiContext, EMPTY_SWEEP_STATUS, SessionContext, SweepStatusContext,
} from '../../../dashboard/react/app/AppProviders/context';
import type { SessionValue, SweepStatusValue } from '../../../dashboard/react/app/AppProviders/types';

export interface RouterProbe {
  location: Location | null;
  navigationType: NavigationType | null;
  navigate: NavigateFunction | null;
  path(): string;
}

export function createRouterProbe(): RouterProbe {
  const probe: RouterProbe = {
    location: null,
    navigationType: null,
    navigate: null,
    path: () => (probe.location ? probe.location.pathname + probe.location.search : ''),
  };
  return probe;
}

export function RouterSpy({ probe }: { probe: RouterProbe }) {
  probe.location = useLocation();
  probe.navigationType = useNavigationType();
  probe.navigate = useNavigate();
  return null;
}

export const stubApi = {
  get: async () => ({}), post: async () => ({}), put: async () => ({}), del: async () => ({}), request: async () => ({}),
} as unknown as ApiClient;

export interface AppHarnessProps {
  children: ReactNode;
  api?: ApiClient;
  me?: UserProfile | null;
  href?: string;
  probe?: RouterProbe;
  sweep?: SweepStatusValue;
  isLiveSweep?: boolean;
  session?: Partial<SessionValue>;
}

function pathOf(href: string): string {
  const url = new URL(href, 'http://localhost');
  return url.pathname + url.search;
}

export function AppHarness({
  children, api = stubApi, me = null, href = '/', probe, sweep, isLiveSweep = false, session = {},
}: AppHarnessProps) {
  const sessionValue: SessionValue = { me, isResolved: true, setMe: vi.fn(), onLogout: vi.fn(), ...session };
  const routed = (
    <MemoryRouter initialEntries={[pathOf(href)]}>
      {probe && <RouterSpy probe={probe} />}
      {children}
    </MemoryRouter>
  );
  return (
    <ApiContext.Provider value={api}>
      <ThemeModeProvider storage={null}>
        <SessionContext.Provider value={sessionValue}>
          {isLiveSweep
            ? <SweepStatusProvider api={api}>{routed}</SweepStatusProvider>
            : <SweepStatusContext.Provider value={sweep ?? EMPTY_SWEEP_STATUS}>{routed}</SweepStatusContext.Provider>}
        </SessionContext.Provider>
      </ThemeModeProvider>
    </ApiContext.Provider>
  );
}
