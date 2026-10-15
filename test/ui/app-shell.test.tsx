import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import type { UserProfile } from '../../dashboard/react/api/types';
import { AppShell, useSettingsDialog } from '../../dashboard/react/app/AppShell';
import type { SweepStatusValue } from '../../dashboard/react/app/AppProviders/types';
import { AppHarness, createRouterProbe, type AppHarnessProps } from './helpers/appHarness';

const me: UserProfile = {
  uid: 'u', email: 'ana@example.com', byokEnabled: true, sharedLlm: null,
  providers: [{ id: 'anthropic', label: 'Anthropic', needsKey: true }],
  llm: { provider: 'grok', model: null, baseUrl: null, hasKey: true, keyHint: 'x', autoIdeas: false },
};

const sweep: SweepStatusValue = {
  data: null,
  health: null,
  meta: { version: '2', timestamp: '2026-10-14T11:30:00.000Z', sourcesQueried: 30, sourcesOk: 29, sourcesFailed: 1, totalDurationMs: 1 },
  sweepError: null,
};

const NOW = () => Date.parse('2026-10-14T12:00:00.000Z');

vi.setConfig({ testTimeout: 20_000 });

function OpenSettingsFromSurface() {
  const { onOpen } = useSettingsDialog();
  return <button type="button" onClick={onOpen}>open from surface</button>;
}

function renderShell(options: Partial<AppHarnessProps> = {}) {
  const probe = createRouterProbe();
  const utils = render(
    <AppHarness me={me} sweep={sweep} probe={probe} {...options}>
      <Routes>
        <Route element={<AppShell now={NOW} />}>
          <Route path="/" element={<p>dashboard surface</p>} />
          <Route path="/digest/:id?" element={<OpenSettingsFromSurface />} />
          <Route path="/media/:channel?" element={<p>media surface</p>} />
        </Route>
      </Routes>
    </AppHarness>,
  );
  return { ...utils, probe };
}

describe('AppShell', () => {
  it('renders the nav tabs as router links with the surface hrefs', () => {
    renderShell();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('href'))).toEqual(['/', '/digest', '/media']);
    expect(tabs.map((t) => t.textContent)).toEqual(['Dashboard', 'Readers Digest', 'Live media']);
    expect(document.querySelector('.crucix-app-bar')).not.toBeNull();
    expect(document.querySelector('.crucix-app-brand-logo')).toHaveAttribute('src', '/brand/mfb-intelligence-navbar-dark-transparent.png');
  });

  it('marks the tab for the current location as selected and follows navigation', () => {
    const { probe } = renderShell({ href: '/digest/abc' });
    expect(screen.getByRole('tab', { name: 'Readers Digest' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(screen.getByRole('tab', { name: 'Live media' }));
    expect(probe.path()).toBe('/media');
    expect(screen.getByRole('tab', { name: 'Live media' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('media surface')).toBeInTheDocument();
  });

  it('shows the live status cluster from the sweep meta and the account controls', () => {
    renderShell();
    expect(document.querySelector('.crucix-app-status')?.textContent).toContain('29/30');
    expect(document.querySelector('.crucix-app-status-model')?.textContent).toBe('GROK');
    expect(document.querySelector('.crucix-app-status-age')?.textContent).toBe('30m ago');
    expect(screen.getByRole('button', { name: /AI key/ })).toHaveTextContent('GROK');
    expect(screen.getByRole('button', { name: /ANA/ })).toHaveTextContent('EXIT');
  });

  it('flips the theme mode from the toggle', () => {
    renderShell();
    const toggle = screen.getByRole('button', { name: 'Switch to light theme' });
    expect(document.documentElement.classList.contains('light')).toBe(false);
    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
    expect(document.querySelector('.crucix-app-brand-logo')).toHaveAttribute('src', '/brand/mfb-intelligence-navbar-light-transparent.png');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('opens the settings overlay from the shell button and pushes ?settings=1', async () => {
    const { probe } = renderShell();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(probe.path()).toBe('/?settings=1');
    expect(probe.location?.state).toEqual({ k: 'settings' });
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(probe.path()).toBe('/');
  });

  it('closes the settings overlay when browser back drops ?settings=1 from the URL', async () => {
    const { probe } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(probe.path()).toBe('/?settings=1');
    act(() => { probe.navigate?.(-1); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(probe.path()).toBe('/');
    act(() => { probe.navigate?.(1); });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens the settings overlay from a surface on any route', async () => {
    const { probe } = renderShell({ href: '/digest?filter=news' });
    fireEvent.click(screen.getByRole('button', { name: 'open from surface' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(probe.path()).toBe('/digest?filter=news&settings=1');
  });

  it('opens settings from a ?settings=1 deep link once the profile resolves, never when auth is off', async () => {
    renderShell({ href: '/?settings=1' });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('renders no account controls or overlay when auth is off', () => {
    renderShell({ href: '/?settings=1', me: null });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
    expect(document.querySelector('.crucix-app-status-model')?.textContent).toBe('Grok');
  });

  it('logs out through the session', () => {
    const onLogout = vi.fn();
    renderShell({ session: { onLogout } });
    fireEvent.click(screen.getByRole('button', { name: /ANA/ }));
    expect(onLogout).toHaveBeenCalled();
  });
});
