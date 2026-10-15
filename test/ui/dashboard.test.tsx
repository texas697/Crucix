import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ApiClient } from '../../dashboard/react/api/client';
import type { UserProfile } from '../../dashboard/react/api/types';
import type { TransportOptions } from '../../dashboard/react/api/transport';

// Control the transport from the test instead of hitting the network.
const captured = vi.hoisted(() => ({ options: null as TransportOptions | null }));
vi.mock('../../dashboard/react/api/transport', () => ({
  shouldUseSse: () => false,
  createTransport: (options: TransportOptions) => {
    captured.options = options;
    return { start: () => () => {}, stop: () => {} };
  },
}));

import { DashboardApp } from '../../dashboard/react/features/dashboard/DashboardApp';

const api = { get: async () => ({}), post: async () => ({}), put: async () => ({}), del: async () => ({}), request: async () => ({}) } as unknown as ApiClient;

const me: UserProfile = { uid: 'u', email: 'ana@example.com', providers: [], byokEnabled: true, sharedLlm: null };

const history = { set: vi.fn(() => true), afterClose: vi.fn(() => 'rewrite' as const), here: () => '/' };

function renderApp(location = { href: 'https://x.test/', pathname: '/', search: '' }, profile: UserProfile | null = me) {
  return render(
    <DashboardApp api={api} me={profile} history={history} location={location} onMeChange={() => {}} onLogout={() => {}} now={() => Date.parse('2026-10-14T12:00:00.000Z')} />,
  );
}

const sweep = {
  meta: { version: '2.0.0', timestamp: '2026-10-14T11:59:00.000Z', totalDurationMs: 1, sourcesQueried: 30, sourcesOk: 29, sourcesFailed: 1 },
  newsFeed: [
    { headline: 'Ticker item one', source: 'BBC', timestamp: '2026-10-14T11:30:00.000Z', url: 'https://e.test/1' },
    { headline: '<script>alert(1)</script>', source: 'X', timestamp: '2026-10-14T11:00:00.000Z', url: 'javascript:alert(1)' },
  ],
};

describe('DashboardApp shell', () => {
  it('shows the startup state before any data arrives', () => {
    renderApp();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/updates itself/i)).toBeInTheDocument();
  });

  it('switches to the dashboard when data arrives and renders the ticker', async () => {
    renderApp();
    captured.options?.onData(sweep as unknown as Parameters<NonNullable<TransportOptions['onData']>>[0]);
    await waitFor(() => expect(screen.getByText('Ticker item one')).toBeInTheDocument());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders hostile headline text, never markup, and drops unsafe links', async () => {
    renderApp();
    captured.options?.onData(sweep as unknown as Parameters<NonNullable<TransportOptions['onData']>>[0]);
    await waitFor(() => expect(screen.getByText('Ticker item one')).toBeInTheDocument());
    // decodeText strips tags (matching the legacy cleanText), so hostile markup survives only as text.
    expect(screen.queryByText(/<script>/)).toBeNull();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
    expect(screen.getByText('alert(1)')).toBeInTheDocument();
  });

  it('shows sources status from the sweep meta', async () => {
    renderApp();
    captured.options?.onData(sweep as unknown as Parameters<NonNullable<TransportOptions['onData']>>[0]);
    await waitFor(() => expect(document.querySelector('.tb-status')?.textContent).toContain('29/30'));
  });

  it('opens settings from a /?settings=1 deep link once the profile resolves', async () => {
    renderApp({ href: 'https://x.test/?settings=1', pathname: '/', search: '?settings=1' });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('does not open settings on a deep link when auth is off', () => {
    renderApp({ href: 'https://x.test/?settings=1', pathname: '/', search: '?settings=1' }, null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
