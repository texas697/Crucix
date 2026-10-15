import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HistoryAdapter } from '../../dashboard/react/state/history';
import { MediaApp } from '../../dashboard/react/features/media/MediaApp';

// Fake hls.js. `instances` records every Hls constructed so tests can assert lifetimes (destroy on
// channel/grid transitions and unmount) and drive the lifecycle events the real player emits.
const hls = vi.hoisted(() => {
  const instances: any[] = [];
  class FakeHls {
    static readonly Events = { MANIFEST_PARSED: 'hlsManifestParsed', ERROR: 'hlsError' };
    static readonly ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError', OTHER_ERROR: 'otherError' };
    static isSupported = vi.fn(() => true);

    readonly config: unknown;
    readonly loadSource = vi.fn();
    readonly attachMedia = vi.fn();
    readonly startLoad = vi.fn();
    readonly destroy = vi.fn();
    private handlers: Record<string, Array<(event: string, data?: unknown) => void>> = {};

    constructor(config?: unknown) {
      this.config = config;
      instances.push(this);
    }

    on(event: string, cb: (event: string, data?: unknown) => void): void {
      (this.handlers[event] ??= []).push(cb);
    }

    emit(event: string, data?: unknown): void {
      for (const cb of this.handlers[event] ?? []) cb(event, data);
    }
  }
  return { FakeHls, instances };
});

vi.mock('hls.js', () => ({ default: hls.FakeHls }));

const requestFullscreen = vi.fn(() => Promise.resolve());

function setCanPlayType(value: string): void {
  Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', {
    configurable: true,
    value: () => value,
  });
}

function createFakeHistory() {
  return {
    set: vi.fn((..._args: unknown[]) => true),
    afterClose: vi.fn(() => 'rewrite' as const),
    here: vi.fn(() => '/media'),
  };
}

function setup(href = 'https://x.test/media/aljazeera') {
  const history = createFakeHistory();
  const url = new URL(href);
  const utils = render(
    <MediaApp
      history={history as unknown as HistoryAdapter}
      location={{ href, pathname: url.pathname, search: url.search }}
    />,
  );
  return { ...utils, history };
}

function videoEl(container: HTMLElement): HTMLVideoElement {
  return container.querySelector('#player') as HTMLVideoElement;
}

beforeEach(() => {
  hls.instances.length = 0;
  hls.FakeHls.isSupported.mockReturnValue(true);
  setCanPlayType('');
  Object.defineProperty(HTMLMediaElement.prototype, 'load', { configurable: true, value: () => {} });
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: () => Promise.resolve() });
  requestFullscreen.mockClear();
  Object.defineProperty(Element.prototype, 'requestFullscreen', { configurable: true, value: requestFullscreen });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('MediaApp routing', () => {
  it('seeds the selected channel from the URL path', () => {
    const { container } = setup('https://x.test/media/rt');
    expect(container.querySelector('.chan.active .cname')?.textContent).toBe('RT');
    expect(container.querySelector('#nowName')?.textContent).toBe('RT');
    expect(container.querySelector('.chan.active')).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to the first channel for an unknown id', () => {
    const { container } = setup('https://x.test/media/not-a-channel');
    expect(container.querySelector('.chan.active .cname')?.textContent).toBe('Al Jazeera English');
  });

  it('seeds grid mode from ?grid=1 and renders four lazy cells', () => {
    const { container } = setup('https://x.test/media/rt?grid=1');
    const grid = container.querySelector('#grid');
    expect(grid).not.toBeNull();
    expect(grid?.querySelectorAll('video')).toHaveLength(4);
    expect(grid?.querySelector('video')?.getAttribute('data-src')).toContain('.m3u8');
    expect(container.querySelector('#btnGrid')).toHaveClass('on');
  });

  it('pushes a history entry on channel change and destroys the previous player', async () => {
    const { container, history } = setup('https://x.test/media/aljazeera');
    expect(hls.instances).toHaveLength(1);
    const first = hls.instances[0];

    await userEvent.click(container.querySelectorAll('.chan')[1] as HTMLElement);

    expect(history.set).toHaveBeenCalledWith(['media', 'rt'], { grid: '' }, { push: true, state: { k: 'channel' } });
    expect(first.destroy).toHaveBeenCalled();
    expect(hls.instances).toHaveLength(2);
    expect(container.querySelector('#nowName')?.textContent).toBe('RT');
  });

  it('replaces (rather than pushes) the history entry when grid mode toggles', async () => {
    const { container, history } = setup('https://x.test/media/rt');
    await userEvent.click(container.querySelector('#btnGrid') as HTMLElement);
    expect(history.set).toHaveBeenLastCalledWith(
      ['media', 'rt'],
      { grid: 1 },
      { push: false, state: { k: 'channel' } },
    );
  });

  it('restores the route on popstate', () => {
    const { container } = setup('https://x.test/media/aljazeera');
    window.history.replaceState({}, '', '/media/france24?grid=1');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(container.querySelector('.chan.active .cname')?.textContent).toBe('France 24 English');
    expect(container.querySelector('#grid')).not.toBeNull();
  });
});

describe('MediaApp player lifecycle', () => {
  it('uses native HLS and constructs no Hls when the browser can play it', () => {
    setCanPlayType('maybe');
    const { container } = setup('https://x.test/media/aljazeera');
    expect(videoEl(container).src).toContain('live-hls-apps-aje-fa.getaj.net');
    expect(hls.instances).toHaveLength(0);
  });

  it('constructs an Hls instance and attaches the media otherwise', () => {
    const { container } = setup('https://x.test/media/aljazeera');
    expect(hls.instances).toHaveLength(1);
    const instance = hls.instances[0];
    expect(instance.loadSource).toHaveBeenCalledWith(expect.stringContaining('.m3u8'));
    expect(instance.attachMedia).toHaveBeenCalledWith(videoEl(container));
  });

  it('creates and tears down grid cells as grid mode is toggled', async () => {
    const { container } = setup('https://x.test/media/aljazeera');
    expect(container.querySelector('#grid')).toBeNull();
    expect(hls.instances).toHaveLength(1);

    await userEvent.click(container.querySelector('#btnGrid') as HTMLElement);
    expect(container.querySelector('#grid')).not.toBeNull();
    expect(container.querySelectorAll('#grid video')).toHaveLength(4);
    expect(hls.instances).toHaveLength(5);
    const cells = hls.instances.slice(1);
    cells.forEach((c) => expect(c.destroy).not.toHaveBeenCalled());

    await userEvent.click(container.querySelector('#btnGrid') as HTMLElement);
    expect(container.querySelector('#grid')).toBeNull();
    cells.forEach((c) => expect(c.destroy).toHaveBeenCalled());
    expect(hls.instances[0].destroy).not.toHaveBeenCalled();
  });

  it('destroys the player on unmount', () => {
    const { unmount } = setup();
    const instance = hls.instances[0];
    unmount();
    expect(instance.destroy).toHaveBeenCalled();
  });
});

describe('MediaApp error handling', () => {
  it('shows the unavailable overlay with broadcaster, YouTube and retry actions', () => {
    setup('https://x.test/media/aljazeera');
    act(() => {
      hls.instances[0].emit('hlsError', { fatal: true, type: 'mediaError' });
    });
    expect(screen.getByText('Feed unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play via YouTube' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open broadcaster page/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('destroys the failed player and starts a new one on retry', async () => {
    setup('https://x.test/media/aljazeera');
    const failed = hls.instances[0];
    act(() => {
      hls.instances[0].emit('hlsError', { fatal: true, type: 'mediaError' });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(failed.destroy).toHaveBeenCalled();
    expect(hls.instances.length).toBeGreaterThan(1);
  });

  it('retries the source on a fatal network error instead of failing', () => {
    setup('https://x.test/media/aljazeera');
    act(() => {
      hls.instances[0].emit('hlsError', { fatal: true, type: 'networkError' });
    });
    expect(hls.instances[0].startLoad).toHaveBeenCalled();
    expect(screen.queryByText('Feed unavailable')).toBeNull();
  });

  it('reports a browser that cannot play HLS at all', () => {
    hls.FakeHls.isSupported.mockReturnValue(false);
    setup('https://x.test/media/aljazeera');
    expect(screen.getByText('Feed unavailable')).toBeInTheDocument();
    expect(screen.getByText('This browser cannot play HLS streams.')).toBeInTheDocument();
  });

  it('swaps the player for the YouTube fallback iframe', async () => {
    const { container } = setup('https://x.test/media/aljazeera');
    act(() => {
      hls.instances[0].emit('hlsError', { fatal: true, type: 'mediaError' });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Play via YouTube' }));
    const frame = container.querySelector('iframe.vframe') as HTMLIFrameElement;
    expect(frame).not.toBeNull();
    expect(frame.src).toContain('youtube.com/embed/');
    expect(screen.queryByText('Feed unavailable')).toBeNull();
  });
});

describe('MediaApp controls', () => {
  it('toggles mute on the button', async () => {
    const { container } = setup();
    await userEvent.click(container.querySelector('#btnMute') as HTMLElement);
    expect(videoEl(container).muted).toBe(true);
    await userEvent.click(container.querySelector('#btnMute') as HTMLElement);
    expect(videoEl(container).muted).toBe(false);
  });

  it('applies the volume slider and mutes at zero', () => {
    const { container } = setup();
    fireEvent.change(container.querySelector('#vol') as HTMLElement, { target: { value: '0.5' } });
    expect(videoEl(container).volume).toBeCloseTo(0.5);
    expect(videoEl(container).muted).toBe(false);

    fireEvent.change(container.querySelector('#vol') as HTMLElement, { target: { value: '0' } });
    expect(videoEl(container).volume).toBe(0);
    expect(videoEl(container).muted).toBe(true);
  });

  it('drives channel, mute and fullscreen from the keyboard', () => {
    const { container, history } = setup('https://x.test/media/aljazeera');

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(history.set).toHaveBeenLastCalledWith(['media', 'rt'], { grid: '' }, { push: true, state: { k: 'channel' } });
    expect(container.querySelector('#nowName')?.textContent).toBe('RT');

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(container.querySelector('#nowName')?.textContent).toBe('Al Jazeera English');

    fireEvent.keyDown(document, { key: 'm' });
    expect(videoEl(container).muted).toBe(true);

    fireEvent.keyDown(document, { key: 'f' });
    expect(requestFullscreen).toHaveBeenCalled();
  });

  it('wraps around the channel list on ArrowLeft from the first channel', () => {
    const { container, history } = setup('https://x.test/media/aljazeera');
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(history.set).toHaveBeenLastCalledWith(['media', 'france24'], { grid: '' }, { push: true, state: { k: 'channel' } });
    expect(container.querySelector('#nowName')?.textContent).toBe('France 24 English');
  });

  it('ignores shortcuts while an input is focused', () => {
    const { container, history } = setup('https://x.test/media/aljazeera');
    const calls = history.set.mock.calls.length;
    fireEvent.keyDown(container.querySelector('#vol') as HTMLElement, { key: 'ArrowRight' });
    expect(history.set.mock.calls.length).toBe(calls);
    expect(container.querySelector('#nowName')?.textContent).toBe('Al Jazeera English');
  });
});
