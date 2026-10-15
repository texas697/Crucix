import { lazy } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppRoutes, type SurfaceComponents, type SurfaceLoaders } from '../../dashboard/react/app/AppRouter';
import { useSurfaceRoute } from '../../dashboard/react/app/AppRouter/hooks/useSurfaceRoute';
import { AppHarness, createRouterProbe } from './helpers/appHarness';

const flagWindow = globalThis as { __CRUCIX_UI__?: unknown };

vi.setConfig({ testTimeout: 20_000 });

function DigestStub({ hasTavily }: { hasTavily: boolean }) {
  const { location } = useSurfaceRoute();
  return <p>digest stub {String(hasTavily)} {location.pathname}</p>;
}

const surfaces: SurfaceComponents = {
  dashboard: () => <p>dashboard stub</p>,
  digest: DigestStub,
  media: () => <p>media stub</p>,
  telegram: () => <p>telegram stub</p>,
};

afterEach(() => {
  delete flagWindow.__CRUCIX_UI__;
});

function deferredSurface(text: string) {
  let resolve: (() => void) | null = null;
  const gate = new Promise<void>((r) => { resolve = r; });
  const component = lazy(() => gate.then(() => ({ default: () => <p>{text}</p> })));
  return { component, resolve: () => resolve?.() };
}

describe('AppRoutes', () => {
  it('commits the navigation before a lazy surface chunk resolves, showing the surface progress bar', async () => {
    const digest = deferredSurface('digest loaded');
    const probe = createRouterProbe();
    const loaders: SurfaceLoaders = {};
    render(
      <AppHarness href="/" probe={probe}>
        <AppRoutes surfaces={{ ...surfaces, digest: digest.component }} loaders={loaders} />
      </AppHarness>,
    );
    expect(screen.getByText('dashboard stub')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Readers Digest' }));
    await waitFor(() => expect(document.querySelector('.crucix-app-surface[data-surface="digest"]')).not.toBeNull());
    expect(screen.queryByText('dashboard stub')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Readers Digest' })).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('.crucix-app-surface-progress')).not.toBeNull();
    await act(async () => { digest.resolve(); });
    expect(await screen.findByText('digest loaded')).toBeInTheDocument();
    expect(document.querySelector('.crucix-app-surface-progress')).toBeNull();
  });

  it('preloads every routed surface chunk once the app is idle', async () => {
    vi.useFakeTimers();
    try {
      const loaders: SurfaceLoaders = { dashboard: vi.fn(async () => ({})), digest: vi.fn(async () => ({})), media: vi.fn(async () => ({})) };
      flagWindow.__CRUCIX_UI__ = { dashboard: 'react', digest: 'react', media: 'legacy' };
      render(
        <AppHarness href="/">
          <AppRoutes surfaces={surfaces} loaders={loaders} />
        </AppHarness>,
      );
      expect(loaders.digest).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(2000); });
      expect(loaders.dashboard).toHaveBeenCalledTimes(1);
      expect(loaders.digest).toHaveBeenCalledTimes(1);
      expect(loaders.media).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the shell mounted while switching between surfaces', () => {
    const probe = createRouterProbe();
    render(
      <AppHarness href="/" probe={probe}>
        <AppRoutes surfaces={surfaces} />
      </AppHarness>,
    );
    expect(screen.getByText('dashboard stub')).toBeInTheDocument();
    const bar = document.querySelector('.crucix-app-bar');
    expect(bar).not.toBeNull();
    expect(document.querySelector('[data-surface="dashboard"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Readers Digest' }));
    expect(probe.path()).toBe('/digest');
    expect(screen.getByText(/digest stub false \/digest/)).toBeInTheDocument();
    expect(screen.queryByText('dashboard stub')).toBeNull();
    expect(document.querySelector('.crucix-app-bar')).toBe(bar);

    fireEvent.click(screen.getByRole('tab', { name: 'Live media' }));
    expect(probe.path()).toBe('/media');
    expect(screen.getByText('media stub')).toBeInTheDocument();
    expect(document.querySelector('.crucix-app-bar')).toBe(bar);

    act(() => { probe.navigate?.(-2); });
    expect(probe.path()).toBe('/');
    expect(screen.getByText('dashboard stub')).toBeInTheDocument();
    expect(document.querySelector('.crucix-app-bar')).toBe(bar);
  });

  it('matches the surface parameters on one route each', () => {
    const probe = createRouterProbe();
    render(
      <AppHarness href="/digest/abc?filter=news" probe={probe}>
        <AppRoutes surfaces={surfaces} />
      </AppHarness>,
    );
    expect(screen.getByText(/digest stub false \/digest\/abc/)).toBeInTheDocument();
    act(() => { probe.navigate?.('/media/rt?grid=1'); });
    expect(screen.getByText('media stub')).toBeInTheDocument();
    expect(document.querySelector('[data-surface="media"]')).not.toBeNull();
  });

  it('has no route for a surface the server still serves as legacy and links it as a document anchor', () => {
    flagWindow.__CRUCIX_UI__ = { dashboard: 'react', digest: 'react', media: 'legacy' };
    const probe = createRouterProbe();
    render(
      <AppHarness href="/" probe={probe}>
        <AppRoutes surfaces={surfaces} />
      </AppHarness>,
    );
    expect(screen.getByText('dashboard stub')).toBeInTheDocument();
    const media = screen.getByRole('tab', { name: 'Live media' });
    expect(media).toHaveClass('crucix-app-nav-tab--legacy');
    expect(media).toHaveAttribute('href', '/media');
    act(() => { probe.navigate?.('/media'); });
    expect(screen.queryByText('media stub')).toBeNull();
    expect(document.querySelector('[data-surface="media"]')).toBeNull();
    expect(document.querySelector('.crucix-app-bar')).toBeNull();
  });
});
