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
          user: { id: '12345', firstName: 'Rudy', username: 'rsanchez', phone: '+1***' },
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

  it('renders connected user and dialogs list', async () => {
    const api = createMockApi();
    const probe = createRouterProbe();

    render(
      <AppHarness api={api} href="/telegram" probe={probe}>
        <TelegramApp />
      </AppHarness>,
    );

    expect(await screen.findByText('Connected (rsanchez)')).toBeInTheDocument();
    const osintElements = await screen.findAllByText('OSINT Wire');
    expect(osintElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Maritime Intel Group')).toBeInTheDocument();
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
});
