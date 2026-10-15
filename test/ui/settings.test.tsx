import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiClient } from '../../dashboard/react/api/client';
import type { LlmProvider, PublicLlm, UserProfile } from '../../dashboard/react/api/types';
import { ThemeModeProvider } from '../../dashboard/react/app/AppProviders/components/ThemeModeProvider';
import { SettingsOverlay } from '../../dashboard/react/features/settings/SettingsOverlay';

type FakeHandlers = {
  get?: (path: string) => Promise<unknown>;
  post?: (path: string, body?: unknown) => Promise<unknown>;
  put?: (path: string, body?: unknown) => Promise<unknown>;
  del?: (path: string) => Promise<unknown>;
  request?: (path: string) => Promise<unknown>;
};

function fakeApi(overrides: FakeHandlers = {}) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const record = (method: string, path: string, body?: unknown) => { calls.push({ method, path, body }); };
  const api = {
    get: async (path: string) => { record('GET', path); return overrides.get ? overrides.get(path) : {}; },
    post: async (path: string, body?: unknown) => { record('POST', path, body); return overrides.post ? overrides.post(path, body) : {}; },
    put: async (path: string, body?: unknown) => { record('PUT', path, body); return overrides.put ? overrides.put(path, body) : {}; },
    del: async (path: string) => { record('DELETE', path); return overrides.del ? overrides.del(path) : {}; },
    request: async (path: string) => { record('REQ', path); return overrides.request ? overrides.request(path) : {}; },
  } as unknown as ApiClient;
  return { api, calls };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const PROVIDERS: LlmProvider[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', needsKey: true, defaultModel: 'claude-sonnet-4-6' },
  { id: 'openai', label: 'OpenAI', needsKey: true, defaultModel: 'gpt-5.4' },
  { id: 'openai-compatible', label: 'OpenAI-compatible (custom URL)', needsKey: false, defaultModel: '', needsBaseUrl: true },
];

async function selectProvider(user: ReturnType<typeof userEvent.setup>, label: string): Promise<void> {
  await user.click(screen.getByRole('combobox', { name: /Provider/ }));
  await user.click(await screen.findByRole('option', { name: label }));
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { uid: 'u', email: 'a@b.c', providers: PROVIDERS, byokEnabled: true, sharedLlm: null, ...overrides };
}

const savedLlm: PublicLlm = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  baseUrl: null,
  hasKey: true,
  keyHint: 'sk-ant-…1234',
  autoIdeas: false,
};

function renderOverlay(props: Partial<React.ComponentProps<typeof SettingsOverlay>> = {}) {
  const handlers = fakeApi();
  const onClose = vi.fn();
  const onProfileChange = vi.fn();
  const onIdeas = vi.fn();
  const utils = render(
    <ThemeModeProvider storage={null}>
      <SettingsOverlay
        isOpen
        me={profile()}
        api={handlers.api}
        onClose={onClose}
        onProfileChange={onProfileChange}
        onIdeas={onIdeas}
        onConfirmRemove={() => true}
        {...props}
      />
    </ThemeModeProvider>,
  );
  return { ...utils, ...handlers, onClose, onProfileChange, onIdeas };
}

describe('SettingsOverlay', () => {
  it('renders nothing when closed', () => {
    renderOverlay({ isOpen: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists providers and toggles the base-URL field for needsBaseUrl/openai providers', async () => {
    const user = userEvent.setup();
    renderOverlay();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Enter your LLM API key');
    await user.click(screen.getByRole('combobox', { name: /Provider/ }));
    expect(await screen.findByRole('option', { name: 'Anthropic (Claude)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'OpenAI' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'OpenAI-compatible (custom URL)' })).toBeInTheDocument();

    expect(screen.queryByLabelText('Base URL')).toBeNull();
    await user.click(screen.getByRole('option', { name: 'OpenAI-compatible (custom URL)' }));
    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
    await selectProvider(user, 'OpenAI');
    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
    await selectProvider(user, 'Anthropic (Claude)');
    expect(screen.queryByLabelText('Base URL')).toBeNull();
  });

  it('renders key/model hints for a saved provider and shows the settingsWho line', () => {
    renderOverlay({ me: profile({ llm: savedLlm }) });
    expect(screen.getByText('Saved key sk-ant-…1234 — leave blank to keep it')).toBeInTheDocument();
    expect(screen.getByText('Default: claude-sonnet-4-6')).toBeInTheDocument();
    expect(screen.getByText(/Signed in as a@b\.c\./)).toBeInTheDocument();
    expect(screen.getByText(/Your key is encrypted at rest/)).toBeInTheDocument();
  });

  it('PUTs the expected body and omits apiKey when the key field is blank', async () => {
    const user = userEvent.setup();
    const { calls, onProfileChange } = renderOverlay();
    await selectProvider(user, 'OpenAI');
    await user.type(screen.getByLabelText(/Model/), 'gpt-5.4');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.path).toBe('/api/me/llm');
    expect(put.body).toEqual({ provider: 'openai', model: 'gpt-5.4', baseUrl: '', autoIdeas: false });
    expect((put.body as Record<string, unknown>).apiKey).toBeUndefined();
    expect(onProfileChange).toHaveBeenCalledTimes(1);
  });

  it('includes apiKey when typed and clears the field after save', async () => {
    const user = userEvent.setup();
    const h = fakeApi({ put: async () => ({ llm: { ...savedLlm } }) });
    renderOverlay({ api: h.api });
    await user.type(screen.getByLabelText('API key'), 'sk-secret');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(h.calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = h.calls.find((c) => c.method === 'PUT')!;
    expect((put.body as Record<string, unknown>).apiKey).toBe('sk-secret');
    await waitFor(() => expect((screen.getByLabelText('API key') as HTMLInputElement).value).toBe(''));
  });

  it('shows the test-key result message', async () => {
    const user = userEvent.setup();
    const { api } = fakeApi({
      post: async (path: string) => (path === '/api/me/llm/test' ? { provider: 'anthropic', model: 'claude', ms: 42 } : {}),
    });
    renderOverlay({ me: profile({ llm: savedLlm }), api });
    await user.click(screen.getByRole('button', { name: 'Test key' }));
    expect(await screen.findByText('OK — anthropic / claude answered in 42 ms')).toBeInTheDocument();
  });

  it('removes the key with DELETE and reports the cleared profile', async () => {
    const user = userEvent.setup();
    const onProfileChange = vi.fn();
    const { api, calls } = fakeApi({ del: async () => ({}) });
    renderOverlay({ me: profile({ llm: savedLlm }), api, onProfileChange });
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
    expect(calls.find((c) => c.method === 'DELETE')!.path).toBe('/api/me/llm');
    expect(await screen.findByText('Removed.')).toBeInTheDocument();
    expect(onProfileChange).toHaveBeenCalledWith(expect.objectContaining({ llm: null }));
    expect(screen.queryByRole('button', { name: 'Test key' })).toBeNull();
  });

  it('generates ideas and forwards the payload to the host', async () => {
    const user = userEvent.setup();
    const onIdeas = vi.fn();
    const payload = { ideas: [{ a: 1 }, { b: 2 }], provider: 'anthropic' };
    const { api } = fakeApi({ post: async (path: string) => (path === '/api/ideas' ? payload : {}) });
    renderOverlay({ me: profile({ llm: savedLlm }), api, onIdeas });
    await user.click(screen.getByRole('button', { name: 'Generate ideas now' }));

    expect(await screen.findByText('Generated 2 ideas via anthropic.')).toBeInTheDocument();
    expect(onIdeas).toHaveBeenCalledWith(payload);
  });

  it('prevents a double submit', async () => {
    const slow = deferred<unknown>();
    const { api, calls } = fakeApi({ put: async () => slow.promise });
    renderOverlay({ api });
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
    slow.resolve({ llm: null });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    renderOverlay({ onClose });
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
