import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiError, type ApiClient } from '../../dashboard/react/api/client';
import { AppProviders, useSession, useThemeMode } from '../../dashboard/react/app/AppProviders';

vi.mock('../../dashboard/react/api/transport', () => ({
  shouldUseSse: () => false,
  createTransport: () => ({ start: () => () => {}, stop: () => {} }),
}));

const replace = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, pathname: '/digest', search: '?filter=news', hostname: 'localhost', origin: 'http://localhost', replace },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  replace.mockClear();
  document.documentElement.classList.remove('light');
});

function apiWith(get: (path: string) => Promise<unknown>): ApiClient {
  return { get, post: async () => ({}), put: async () => ({}), del: async () => ({}), request: async () => ({}) } as unknown as ApiClient;
}

function SessionProbe() {
  const { me, isResolved } = useSession();
  const { mode } = useThemeMode();
  return <p>{isResolved ? `resolved:${me ? me.email : 'none'}` : 'pending'} mode:{mode}</p>;
}

describe('AppProviders session', () => {
  it('resolves the profile from /api/me', async () => {
    const api = apiWith(async () => ({ uid: 'u', email: 'ana@example.com', providers: [], byokEnabled: true, sharedLlm: null }));
    render(<AppProviders api={api} storage={null}><SessionProbe /></AppProviders>);
    await screen.findByText('resolved:ana@example.com mode:dark');
    expect(replace).not.toHaveBeenCalled();
  });

  it('treats a 404 as auth off and never redirects', async () => {
    const api = apiWith(async () => { throw new ApiError('not-found', 404, 'nope'); });
    render(<AppProviders api={api} storage={null}><SessionProbe /></AppProviders>);
    await screen.findByText('resolved:none mode:dark');
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects a 401 to /login carrying the current path', async () => {
    const api = apiWith(async () => { throw new ApiError('session-expired', 401, 'expired'); });
    render(<AppProviders api={api} storage={null}><SessionProbe /></AppProviders>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fdigest%3Ffilter%3Dnews'));
    expect(screen.getByText('pending mode:dark')).toBeInTheDocument();
  });

  it('boots in the stored theme mode', async () => {
    const storage = { getItem: () => 'light', setItem: vi.fn() };
    const api = apiWith(async () => { throw new ApiError('not-found', 404, 'nope'); });
    render(<AppProviders api={api} storage={storage}><SessionProbe /></AppProviders>);
    await screen.findByText('resolved:none mode:light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
