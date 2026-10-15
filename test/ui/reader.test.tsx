import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiClient } from '../../dashboard/react/api/client';
import type { UserProfile } from '../../dashboard/react/api/types';
import { Reader, type Article, type ReaderTarget } from '../../dashboard/react/features/reader/Reader';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

type FakeHandlers = {
  get?: (path: string) => Promise<unknown>;
  post?: (path: string, body?: unknown) => Promise<unknown>;
  put?: (path: string, body?: unknown) => Promise<unknown>;
  del?: (path: string) => Promise<unknown>;
  request?: (path: string) => Promise<unknown>;
};

function fakeApi(overrides: FakeHandlers = {}) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const api = {
    get: async (path: string) => { calls.push({ method: 'GET', path }); return {}; },
    post: async (path: string, body?: unknown) => { calls.push({ method: 'POST', path, body }); return {}; },
    put: async (path: string, body?: unknown) => { calls.push({ method: 'PUT', path, body }); return {}; },
    del: async (path: string) => { calls.push({ method: 'DELETE', path }); return {}; },
    request: async (path: string) => { calls.push({ method: 'REQ', path }); return {}; },
    ...overrides,
  } as unknown as ApiClient;
  return { api, calls };
}

const meWithKey: UserProfile = { uid: 'u', email: 'a@b.c', llm: { provider: 'x' } } as UserProfile;
const meNoKey: UserProfile = { uid: 'u', email: 'a@b.c' } as UserProfile;

const article: Article = {
  id: 'a1', title: 'A title', source: 'BBC', topics: ['AI'],
  description: 'Plain **body** text', url: 'https://e.test/x',
};

function renderReader(target: ReaderTarget | null, props: Partial<React.ComponentProps<typeof Reader>> = {}) {
  const handlers = fakeApi({
    get: async (path: string) => {
      if (path.startsWith('/api/digest/article/')) return { ...article };
      if (path.endsWith('/research')) return { state: 'none' };
      return {};
    },
    post: async (path: string) => {
      if (path.endsWith('/feedback')) return { rating: 1 };
      if (path.endsWith('/summarize')) return { ...article, summarizedBy: 'user', summaryMd: 'sum' };
      return {};
    },
  });
  const utils = render(
    <Reader target={target} api={handlers.api} me={meWithKey} hasTavily={false}
      onClose={() => {}} onOpenSettings={() => {}} {...props} />,
  );
  return { ...utils, ...handlers };
}

describe('Reader', () => {
  it('renders nothing when closed', () => {
    renderReader(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('loads an article by id and renders safe markdown', async () => {
    renderReader({ id: 'a1' });
    expect(await screen.findByText('A title')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('body').tagName).toBe('STRONG');
    expect(within(dialog).getByText('Original ↗')).toHaveAttribute('href', 'https://e.test/x');
  });

  it('never renders markup from hostile article fields', async () => {
    const { api } = fakeApi({
      get: async () => ({ ...article, title: '<img src=x onerror=alert(1)>', summaryMd: '<script>alert(1)</script>' }),
    });
    render(<Reader target={{ id: 'a1' }} api={api} me={meWithKey} hasTavily={false} onClose={() => {}} onOpenSettings={() => {}} />);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('img')).toBeNull();
    expect(dialog.querySelector('script')).toBeNull();
  });

  it('does not POST summarize or research on render or rerender', async () => {
    const { api, calls, rerender } = renderReader({ id: 'a1' });
    await screen.findByText('A title');
    rerender(<Reader target={{ id: 'a1' }} api={api} me={meWithKey} hasTavily={false} onClose={() => {}} onOpenSettings={() => {}} />);
    await screen.findByText('A title');
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('sends a rating and reports it to the host', async () => {
    const onVote = vi.fn();
    const { api } = fakeApi({
      get: async (path: string) => (path.startsWith('/api/digest/article/') ? { ...article } : { state: 'none' }),
      post: async (path: string) => (path.endsWith('/feedback') ? { rating: -1 } : {}),
    });
    render(<Reader target={{ id: 'a1' }} api={api} me={meWithKey} hasTavily={false} onClose={() => {}} onOpenSettings={() => {}} onVote={onVote} />);
    await screen.findByText('A title');
    await userEvent.click(screen.getByLabelText('Less like this'));
    await waitFor(() => expect(onVote).toHaveBeenCalledWith('a1', -1));
  });

  it('ignores a late response for a previously opened article', async () => {
    const slowA = deferred<Article>();
    const { api } = fakeApi({
      get: async (path: string) => {
        if (path.includes('a1')) return slowA.promise;
        if (path.includes('b1')) return { ...article, id: 'b1', title: 'B title' };
        return { state: 'none' };
      },
    });
    const { rerender } = render(<Reader target={{ id: 'a1' }} api={api} me={meWithKey} hasTavily={false} onClose={() => {}} onOpenSettings={() => {}} />);
    rerender(<Reader target={{ id: 'b1' }} api={api} me={meWithKey} hasTavily={false} onClose={() => {}} onOpenSettings={() => {}} />);
    await screen.findByText('B title');
    slowA.resolve({ ...article, title: 'A title (late)' });
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByText('B title')).toBeInTheDocument();
    expect(screen.queryByText('A title (late)')).toBeNull();
  });

  it('polls running research until it completes', async () => {
    let polls = 0;
    const { api } = fakeApi({
      get: async (path: string) => {
        if (path.startsWith('/api/digest/article/')) return { ...article, research: { state: 'running', stage: 'searching', progress: 10 } };
        if (path.endsWith('/research')) {
          polls += 1;
          return polls >= 2 ? { state: 'done', markdown: 'Deep **dive**', model: 'm' } : { state: 'running', stage: 'reading', progress: 50 };
        }
        return {};
      },
    });
    render(<Reader target={{ id: 'a1' }} api={api} me={meWithKey} hasTavily={false} onClose={() => {}} onOpenSettings={() => {}} pollMs={20} />);
    expect(await screen.findByText('Deep')).toBeInTheDocument();
    expect(polls).toBeGreaterThanOrEqual(2);
  });

  it('calls the host settings callback from the key CTA when signed in without a key', async () => {
    const onOpenSettings = vi.fn();
    renderReader({ id: 'a1' }, { me: meNoKey, onOpenSettings });
    await screen.findByText('A title');
    await userEvent.click(screen.getAllByRole('button', { name: /Enter API key/ })[0]!);
    expect(onOpenSettings).toHaveBeenCalled();
  });
});
