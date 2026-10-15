import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '../../dashboard/react/app/AppShell';
import { DEFAULT_UI_FLAGS, isReactSurface, readUiFlags } from '../../dashboard/react/app/uiFlags';
import { AppHarness, createRouterProbe } from './helpers/appHarness';

const flagWindow = globalThis as { __CRUCIX_UI__?: unknown };

vi.setConfig({ testTimeout: 20_000 });

afterEach(() => {
  delete flagWindow.__CRUCIX_UI__;
});

describe('readUiFlags', () => {
  it('treats every migrated surface as React when the server injected nothing', () => {
    expect(readUiFlags()).toEqual(DEFAULT_UI_FLAGS);
    expect(isReactSurface(readUiFlags(), 'dashboard')).toBe(true);
    expect(isReactSurface(readUiFlags(), 'login')).toBe(false);
  });

  it('merges the injected flags over the defaults and ignores garbage', () => {
    flagWindow.__CRUCIX_UI__ = { media: 'legacy' };
    expect(readUiFlags()).toEqual({ dashboard: 'react', digest: 'react', media: 'legacy', telegram: 'react' });
    flagWindow.__CRUCIX_UI__ = ['nope'];
    expect(readUiFlags()).toEqual(DEFAULT_UI_FLAGS);
  });
});

describe('shell nav fallback for legacy surfaces', () => {
  it('renders a plain anchor (document navigation) for a surface the server still owns', () => {
    flagWindow.__CRUCIX_UI__ = { dashboard: 'react', digest: 'react', media: 'legacy' };
    const probe = createRouterProbe();
    render(
      <AppHarness href="/" probe={probe}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<p>dash</p>} />
            <Route path="/digest" element={<p>digest</p>} />
          </Route>
        </Routes>
      </AppHarness>,
    );
    const media = screen.getByRole('tab', { name: 'Live media' });
    expect(media.tagName).toBe('A');
    expect(media).toHaveAttribute('href', '/media');
    expect(media).toHaveClass('crucix-app-nav-tab--legacy');
    const digest = screen.getByRole('tab', { name: 'Readers Digest' });
    expect(digest).not.toHaveClass('crucix-app-nav-tab--legacy');

    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('click', prevent, true);
    fireEvent.click(media);
    document.removeEventListener('click', prevent, true);
    expect(probe.path()).toBe('/');

    fireEvent.click(digest);
    expect(probe.path()).toBe('/digest');
  });
});
