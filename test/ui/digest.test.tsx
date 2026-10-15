import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiClient } from '../../dashboard/react/api/client';
import { DigestApp, type DigestCardItem } from '../../dashboard/react/features/digest';
import { AppHarness, createRouterProbe } from './helpers/appHarness';

const card: DigestCardItem = {
  id: 'a1',
  source: 'BBC',
  kind: 'news',
  title: 'Card one',
  description: 'A short description',
  publishedAt: '2024-01-01T00:00:00.000Z',
  hasWriteup: true,
  topics: ['AI', 'Policy', 'Trade', 'Extra'],
  vote: 0,
};

interface SetupOptions {
  href?: string;
  items?: DigestCardItem[];
}

function setup(options: SetupOptions = {}) {
  const listResponse = {
    items: options.items ?? [card],
    topics: [{ topic: 'AI', count: 2 }, { topic: 'Policy', count: 1 }],
    total: 1,
    storeSize: 10,
    mode: 'chronological',
    votes: 0,
    minVotesForAffinity: 5,
    taste: { likes: [{ topic: 'AI' }], dislikes: [{ topic: 'Policy' }] },
  };

  const get = vi.fn(async (path: string) => {
    if (path.startsWith('/api/digest/list')) return { ...listResponse };
    if (path.startsWith('/api/digest/article/')) {
      return { id: path.split('/').pop(), title: 'Deep article', source: 'X', url: null, vote: 0, topics: [] };
    }
    return {};
  });
  const post = vi.fn(async (path: string, body?: unknown) => {
    if (path.endsWith('/feedback')) return { rating: (body as { rating: number }).rating };
    return {};
  });

  const api = { request: vi.fn(), get, post, put: vi.fn(), del: vi.fn() } as unknown as ApiClient;
  const probe = createRouterProbe();
  const element = (
    <AppHarness api={api} me={null} href={options.href ?? 'https://x.test/digest'} probe={probe}>
      <DigestApp hasTavily={false} />
    </AppHarness>
  );

  const utils = render(element);
  return { ...utils, element, api, get, post, probe };
}

function listCalls(get: ReturnType<typeof vi.fn>): string[] {
  return get.mock.calls.map((c) => String(c[0])).filter((p) => p.startsWith('/api/digest/list'));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('DigestApp', () => {
  it('seeds the list request from the URL and renders cards', async () => {
    const h = setup({ href: 'https://x.test/digest?filter=foryou&topic=AI&q=climate' });
    expect(await screen.findByText('Card one')).toBeInTheDocument();
    expect(h.get).toHaveBeenCalledWith('/api/digest/list?filter=foryou&topic=AI&q=climate');
    expect(screen.getByText(/10 IN LIBRARY/)).toBeInTheDocument();
  });

  it('pushes history and refetches when a filter changes', async () => {
    const h = setup();
    await screen.findByText('Card one');

    await userEvent.click(screen.getByRole('button', { name: 'For you' }));

    expect(h.probe.path()).toBe('/digest?filter=foryou');
    expect(h.probe.navigationType).toBe('PUSH');
    expect(h.probe.location?.state).toEqual({ k: 'list' });
    await waitFor(() =>
      expect(h.get).toHaveBeenCalledWith('/api/digest/list?filter=foryou&topic=&q='),
    );
  });

  it('re-applies the route and refetches when the browser goes back', async () => {
    const h = setup();
    await screen.findByText('Card one');
    await userEvent.click(screen.getByRole('button', { name: 'For you' }));
    await waitFor(() => expect(h.get).toHaveBeenCalledWith('/api/digest/list?filter=foryou&topic=&q='));
    const before = listCalls(h.get).length;

    act(() => { h.probe.navigate?.(-1); });

    await waitFor(() => expect(h.probe.path()).toBe('/digest'));
    await waitFor(() => expect(listCalls(h.get).length).toBe(before + 1));
    expect(listCalls(h.get).at(-1)).toBe('/api/digest/list?filter=all&topic=&q=');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens an article by pushing /digest/:id without remounting the list', async () => {
    const h = setup();
    await screen.findByText('Card one');
    const before = listCalls(h.get).length;
    await userEvent.click(screen.getByText('Card one'));
    expect(h.probe.path()).toBe('/digest/a1');
    expect(h.probe.location?.state).toEqual({ k: 'read' });
    expect(await screen.findByText('Deep article')).toBeInTheDocument();
    expect(listCalls(h.get).length).toBe(before);
  });

  it('debounces a burst of search input into a single list request', async () => {
    const h = setup();
    await screen.findByText('Card one');

    const input = screen.getByLabelText('Search titles, topics, write-ups');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    await waitFor(() =>
      expect(listCalls(h.get).filter((p) => p.includes('q=abc'))).toHaveLength(1),
    );
    await new Promise((r) => setTimeout(r, 350));
    expect(listCalls(h.get).filter((p) => p.includes('q=abc'))).toHaveLength(1);
  });

  it('opens the reader for a deep-linked article id', async () => {
    const h = setup({ href: 'https://x.test/digest/abc' });
    expect(await screen.findByText('Deep article')).toBeInTheDocument();
    expect(h.get).toHaveBeenCalledWith('/api/digest/article/abc');
  });

  it('renders the empty state when the list is empty', async () => {
    setup({ items: [] });
    expect(await screen.findByText(/NOTHING HERE YET/)).toBeInTheDocument();
  });

  it('rates a card in place without refetching the list', async () => {
    const h = setup();
    await screen.findByText('Card one');
    const before = listCalls(h.get).length;

    const cardEl = screen.getByText('Card one').closest('.dg-card') as HTMLElement;
    await userEvent.click(within(cardEl).getByLabelText('More like this'));

    await waitFor(() => expect(h.post).toHaveBeenCalledWith('/api/digest/a1/feedback', { rating: 1 }));
    await waitFor(() =>
      expect(within(cardEl).getByLabelText('More like this')).toHaveAttribute('aria-pressed', 'true'),
    );
    expect(listCalls(h.get).length).toBe(before);
  });

  it('does not POST on render or rerender', async () => {
    const h = setup();
    await screen.findByText('Card one');
    h.rerender(h.element);
    await screen.findByText('Card one');
    expect(h.post).not.toHaveBeenCalled();
  });
});
