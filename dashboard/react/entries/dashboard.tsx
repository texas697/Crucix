import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createApiClient, type ApiClient } from '../api/client';
import { createHistoryAdapter } from '../state/history';
import { applyTheme, readStoredTheme, resolveTheme } from '../shared/theme';
import type { UserProfile } from '../api/types';
import { DashboardApp } from '../features/dashboard/DashboardApp';

// Dashboard entry. Loads /api/me (404 = auth-off local mode, 401 = expired session) and mounts the
// React dashboard. The legacy page is still served unless UI_DASHBOARD=react, so this only runs when
// the server selected it.

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

async function fetchMe(api: ApiClient): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>('/api/me');
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    if (status === 401) {
      location.replace(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    }
    // 404 (auth off) or a transient error -> local mode, not a logout.
    return null;
  }
}

const api = createApiClient();
const history = createHistoryAdapter(window.history, window.location);

function Root() {
  const [me, setMe] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;
    fetchMe(api).then((profile) => { if (active) setMe(profile); });
    return () => { active = false; };
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/logout'); } catch { /* already signed out */ }
    location.replace('/login');
  }, []);

  return (
    <DashboardApp
      api={api}
      me={me}
      history={history}
      location={{ href: window.location.href, pathname: window.location.pathname, search: window.location.search }}
      onMeChange={setMe}
      onLogout={logout}
    />
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('[crucix] missing #root for the dashboard surface');

// Apply the stored theme before first paint.
applyTheme(resolveTheme(readStoredTheme(safeStorage())), document.documentElement);

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
