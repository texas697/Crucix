import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiError, createApiClient } from '../api/client';
import type { UserProfile } from '../api/types';
import { createHistoryAdapter } from '../state/history';
import { PageShell } from '../app/PageShell';
import { DigestApp } from '../features/digest/DigestApp';

// React entry for the Readers Digest surface. Unlike the P1 placeholder it wires the real transports:
// a same-origin API client, the history adapter over window.history, and the /api/me session probe.
// A 401 here means the session expired, so we bounce to /login with the current path; a 404 from
// /api/me is the auth-off case (local mode) and is explicitly NOT an error, matching the legacy page.

function redirectToLogin(): void {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace('/login?next=' + next);
}

async function loadMe(api: ReturnType<typeof createApiClient>): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>('/api/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
      return null;
    }
    // 404 (auth off / local mode) and any other failure: render signed-out rather than erroring.
    return null;
  }
}

async function boot(): Promise<void> {
  const container = document.getElementById('root');
  if (!container) throw new Error('[crucix] missing #root for the digest surface');

  const api = createApiClient();
  const history = createHistoryAdapter(window.history, window.location);
  const hasTavily = Boolean((window as unknown as { __HAS_TAVILY__?: boolean }).__HAS_TAVILY__);

  const me = await loadMe(api);

  const onLogout = () => {
    void api.post('/api/logout').catch(() => { /* best effort */ }).finally(() => {
      window.location.replace('/login');
    });
  };

  createRoot(container).render(
    <StrictMode>
      <PageShell surface="digest">
        <DigestApp
          api={api}
          me={me}
          hasTavily={hasTavily}
          history={history}
          location={{
            href: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search,
          }}
          onOpenSettings={() => { window.location.href = '/?settings=1'; }}
          onLogout={onLogout}
        />
      </PageShell>
    </StrictMode>,
  );
}

void boot();
