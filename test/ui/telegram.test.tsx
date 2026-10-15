import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ApiClient } from '../../dashboard/react/api/client';
import { TelegramApp } from '../../dashboard/react/features/telegram';
import { AppHarness, createRouterProbe } from './helpers/appHarness';

function createMockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    get: async <T = unknown>(path: string): Promise<T> => {
      if (path === '/api/telegram/status') {
        return {
          configured: true,
          authenticated: true,
          connected: true,
        } as unknown as T;
      }
      if (path === '/api/telegram/dialogs') {
        return {
          dialogs: [
            {
              id: '1001',
              title: 'OSINT Wire',
              unreadCount: 3,
              type: 'channel',
              date: '2026-10-15T12:00:00Z',
              lastMessage: { id: 1, text: 'Breaking news update', date: '2026-10-15T12:00:00Z' },
            },
            {
              id: '1002',
              title: 'Maritime Intel Group',
              unreadCount: 0,
              type: 'group',
              date: '2026-10-15T11:30:00Z',
              lastMessage: { id: 2, text: 'Vessel tracking active', date: '2026-10-15T11:30:00Z' },
            },
          ],
        } as unknown as T;
      }
      if (path.startsWith('/api/telegram/messages/1001')) {
        return {
          messages: [
            {
              id: 101,
              text: 'Reconnaissance sweep completed over Black Sea.',
              date: '2026-10-15T12:00:00Z',
              senderId: '999',
              out: false,
              mediaType: null,
              replyToMsgId: null,
            },
            {
              id: 102,
              text: 'Satellite imagery confirmed deployment.',
              date: '2026-10-15T12:05:00Z',
              senderId: '999',
              out: false,
              mediaType: 'photo',
              replyToMsgId: null,
            },
            {
              id: 103,
              text: 'از حضور در مجاورت مراکز نظامی اجتناب بفرمایید.',
              date: '2026-10-15T12:06:00Z',
              senderId: '999',
              out: false,
              mediaType: null,
              replyToMsgId: null,
              translation: { text: 'Avoid the vicinity of military centres.', from: 'fa' },
            },
            {
              id: 104,
              text: 'https://en.mehrnews.com/news/1/Tanker',
              date: '2026-10-15T12:07:00Z',
              senderId: '999',
              out: false,
              mediaType: 'webpage',
              replyToMsgId: null,
              webpage: { url: 'https://en.mehrnews.com/news/1/Tanker', displayUrl: 'en.mehrnews.com/news/1/Tanker', siteName: 'Mehr News Agency', title: 'Tanker catches fire', description: 'TEHRAN (MNA) – a tanker.', hasPhoto: true },
            },
            {
              id: 105,
              text: 'Strike footage',
              date: '2026-10-15T12:08:00Z',
              senderId: '999',
              out: false,
              mediaType: 'video',
              replyToMsgId: null,
              media: { kind: 'video', mime: 'video/mp4', width: 640, height: 360, size: 788518, duration: 24, tooLarge: false },
            },
          ],
        } as unknown as T;
      }
      return {} as unknown as T;
    },
    post: async () => ({}),
    put: async () => ({}),
    del: async () => ({}),
    request: async () => ({}),
    ...overrides,
  } as unknown as ApiClient;
}

describe('TelegramApp', () => {
  it('renders status notice when unconfigured or disconnected', async () => {
    const unconfiguredApi = createMockApi({
      get: async <T = unknown>(path: string): Promise<T> => {
        if (path === '/api/telegram/status') {
          return {
            configured: false,
            authenticated: false,
            connected: false,
            message: 'Telegram API credentials missing.',
          } as unknown as T;
        }
        return {} as unknown as T;
      },
    });

    render(
      <AppHarness api={unconfiguredApi} href="/telegram">
        <TelegramApp />
      </AppHarness>,
    );

    expect(await screen.findByText('Telegram MTProto Setup Required')).toBeInTheDocument();
    expect(screen.getByText('npm run telegram:auth')).toBeInTheDocument();
  });

  it('renders the dialogs list without a header when connected', async () => {
    const api = createMockApi();
    const probe = createRouterProbe();

    render(
      <AppHarness api={api} href="/telegram" probe={probe}>
        <TelegramApp />
      </AppHarness>,
    );

    const osintElements = await screen.findAllByText('OSINT Wire');
    expect(osintElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Maritime Intel Group')).toBeInTheDocument();
    expect(screen.queryByText('Telegram Monitor')).toBeNull();
  });

  it('filters dialogs using the search field', async () => {
    const api = createMockApi();

    render(
      <AppHarness api={api} href="/telegram">
        <TelegramApp />
      </AppHarness>,
    );

    const osintElements = await screen.findAllByText('OSINT Wire');
    expect(osintElements.length).toBeGreaterThan(0);
    const input = screen.getByPlaceholderText('Filter chats & channels...');
    fireEvent.change(input, { target: { value: 'Maritime' } });

    expect(screen.queryByText('Breaking news update')).toBeNull();
    expect(screen.getByText('Vessel tracking active')).toBeInTheDocument();
  });

  it('renders read-only message stream when a chat is selected', async () => {
    const api = createMockApi();
    const probe = createRouterProbe();

    render(
      <AppHarness api={api} href="/telegram" probe={probe}>
        <TelegramApp />
      </AppHarness>,
    );

    expect(await screen.findByText('Reconnaissance sweep completed over Black Sea.')).toBeInTheDocument();
    expect(screen.getByText('Read-only stream')).toBeInTheDocument();
    expect(screen.getByText('[photo]')).toBeInTheDocument();
  });

  it('shows the English translation first and reveals the original on demand', async () => {
    render(
      <AppHarness api={createMockApi()} href="/telegram">
        <TelegramApp />
      </AppHarness>,
    );

    expect(await screen.findByText('Avoid the vicinity of military centres.')).toBeInTheDocument();
    expect(screen.queryByText('از حضور در مجاورت مراکز نظامی اجتناب بفرمایید.')).toBeNull();
    fireEvent.click(screen.getByText('translated from Persian · show original'));
    expect(screen.getByText('از حضور در مجاورت مراکز نظامی اجتناب بفرمایید.')).toBeInTheDocument();
    expect(screen.getByText('translated from Persian · hide original')).toBeInTheDocument();
  });

  it('renders a link card for webpage posts instead of the bare URL', async () => {
    render(
      <AppHarness api={createMockApi()} href="/telegram">
        <TelegramApp />
      </AppHarness>,
    );

    const title = await screen.findByText('Tanker catches fire');
    expect(title.closest('a')).toHaveAttribute('href', 'https://en.mehrnews.com/news/1/Tanker');
    expect(await screen.findByText('Mehr News Agency', { selector: '.crucix-telegram-webpage-site' })).toBeInTheDocument();
    expect(await screen.findByText('TEHRAN (MNA) – a tanker.')).toBeInTheDocument();
    expect(screen.queryByText('[webpage]')).toBeNull();
    expect(screen.queryByText('https://en.mehrnews.com/news/1/Tanker')).toBeNull();
  });

  it('streams photos and videos through the media proxy', async () => {
    const { container } = render(
      <AppHarness api={createMockApi()} href="/telegram">
        <TelegramApp />
      </AppHarness>,
    );

    await screen.findByText('Strike footage');
    const video = container.querySelector('video.crucix-telegram-media-video');
    expect(video).toHaveAttribute('src', '/api/telegram/media/1001/105?kind=file');
    expect(video).toHaveAttribute('poster', '/api/telegram/media/1001/105?kind=thumb');
    const preview = container.querySelector('img.crucix-telegram-webpage-image');
    expect(preview).toHaveAttribute('src', '/api/telegram/media/1001/104?kind=webpage');
  });
});
