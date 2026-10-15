import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

// jsdom has no WebGL; MapView constructs a real maplibregl.Map, so stub it (see mapview.test.tsx).
vi.mock('maplibre-gl', () => {
  class Map {
    dragPan = { enable: () => {}, disable: () => {} };
    constructor(_options: unknown) {}
    on() { return this; }
    once() { return this; }
    off() { return this; }
    addSource() {}
    addLayer() {}
    getSource() { return { setData: () => {} }; }
    getLayer() { return {}; }
    setStyle() {}
    flyTo() {}
    fitBounds() {}
    resize() {}
    remove() {}
    project() { return { x: 0, y: 0 }; }
    queryRenderedFeatures() { return []; }
    getContainer() { return document.createElement('div'); }
    getZoom() { return 1.35; }
  }
  class Marker {
    constructor(_options?: unknown) {}
    setLngLat() { return this; }
    addTo() { return this; }
    remove() {}
    getElement() { return document.createElement('div'); }
  }
  return { default: { Map, Marker }, Map, Marker };
});

import { DashboardApp } from '../../dashboard/react/features/dashboard';
import { AppHarness, createRouterProbe } from './helpers/appHarness';

const api = { get: async () => ({}), post: async () => ({}), put: async () => ({}), del: async () => ({}), request: async () => ({}) } as unknown as ApiClient;

const me: UserProfile = { uid: 'u', email: 'ana@example.com', providers: [], byokEnabled: true, sharedLlm: null };

function renderApp(href = 'https://x.test/', profile: UserProfile | null = me) {
  const probe = createRouterProbe();
  const utils = render(
    <AppHarness api={api} me={profile} href={href} probe={probe} isLiveSweep>
      <DashboardApp now={() => Date.parse('2026-10-14T12:00:00.000Z')} />
    </AppHarness>,
  );
  return { ...utils, probe };
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

  it('shows the region sources status from the sweep meta', async () => {
    renderApp();
    captured.options?.onData(sweep as unknown as Parameters<NonNullable<TransportOptions['onData']>>[0]);
    await waitFor(() => expect(document.querySelector('.map-bar-meta')?.textContent).toContain('29/30 sources'));
  });

  it('renders no top bar of its own (the shell owns it)', async () => {
    renderApp();
    captured.options?.onData(sweep as unknown as Parameters<NonNullable<TransportOptions['onData']>>[0]);
    await waitFor(() => expect(screen.getByText('Ticker item one')).toBeInTheDocument());
    expect(document.querySelector('.topbar')).toBeNull();
    expect(document.querySelector('header')).toBeNull();
  });

  it('pushes the region into the router URL when a region is chosen', async () => {
    const { probe } = renderApp();
    captured.options?.onData(sweep as unknown as Parameters<NonNullable<TransportOptions['onData']>>[0]);
    await waitFor(() => expect(screen.getByText('Ticker item one')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^europe$/i }));
    await waitFor(() => expect(probe.path()).toBe('/?region=europe'));
    expect(probe.location?.state).toEqual({ k: 'region' });
  });
});
