import { StrictMode, Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { createApiClient, type ApiClient } from '../api/client';
import { createHistoryAdapter } from '../state/history';
import { applyTheme, readStoredTheme, resolveTheme } from '../shared/theme';
import type { UserProfile } from '../api/types';
import { PageShell } from '../app/PageShell';
import { isReactSurface, readUiFlags } from '../app/uiFlags';
import type { Surface } from '../app/surfaces';

// SPA entry. One document, one React root, client-side routes for every React-owned surface:
//
//   /                      -> dashboard
//   /digest, /digest/:id   -> Readers Digest
//   /media, /media/:channel -> Live media
//
// The bootstrap the per-surface entries used to duplicate (api client, theme read/apply, the /api/me
// probe, StrictMode, PageShell) lives here once. Each surface is imported through React.lazy so the
// surface code stays in its own chunk. Surfaces whose `window.__CRUCIX_UI__` flag is not 'react' have
// no route here — the server serves their legacy document, and the shell nav links to them with a
// plain <a> (see app/NavItem.tsx).

const DashboardSurface = lazy(() => import('../surfaces/DashboardSurface'));
const DigestSurface = lazy(() => import('../surfaces/DigestSurface'));
const MediaSurface = lazy(() => import('../surfaces/MediaSurface'));

interface LocationSnapshot { href: string; pathname: string; search: string }

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/** Live window.location snapshot for the surfaces' own (query-param) history handling. */
function currentLocation(): LocationSnapshot {
  return {
    href: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

/**
 * Probe /api/me. A 401 means the session expired, so bounce to /login carrying the current path;
 * a 404 is the auth-off local mode and is NOT a logout (matching the legacy pages).
 */
async function fetchMe(api: ApiClient): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>('/api/me');
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    if (status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
    return null;
  }
}

/** Wrap a lazy surface in the shell so markup/classes match the per-surface documents exactly. */
function SurfaceMount({ surface, children }: { surface: Surface; children: ReactNode }) {
  return (
    <PageShell surface={surface}>
      <Suspense fallback={null}>{children}</Suspense>
    </PageShell>
  );
}

export interface AppRootProps {
  api: ApiClient;
  me: UserProfile | null;
  onMeChange: (me: UserProfile | null) => void;
  onLogout: () => void;
}

/** The router + routes. Exported so tests can render it without the entry's side effects. */
export function AppRoot({ api, me, onMeChange, onLogout }: AppRootProps) {
  return (
    <BrowserRouter>
      <AppRoutes api={api} me={me} onMeChange={onMeChange} onLogout={onLogout} />
    </BrowserRouter>
  );
}

function AppRoutes({ api, me, onMeChange, onLogout }: AppRootProps) {
  const navigate = useNavigate();
  const flags = readUiFlags();
  // The surfaces exchange query params through their own history adapter; the router owns the
  // pathname. Both read the same window history/location, so a popstate is handled once per concern.
  const history = useMemo(() => createHistoryAdapter(window.history, window.location), []);
  const location = currentLocation();
  const hasTavily = Boolean((window as unknown as { __HAS_TAVILY__?: boolean }).__HAS_TAVILY__);

  // The digest "settings" affordance targets the dashboard's ?settings=1 deep link. Navigate through
  // the router instead of assigning window.location so the shell is not reloaded.
  const openSettings = useCallback(() => { navigate('/?settings=1'); }, [navigate]);

  const dashboard = (
    <SurfaceMount surface="dashboard">
      <DashboardSurface
        api={api}
        me={me}
        history={history}
        location={location}
        onMeChange={onMeChange}
        onLogout={onLogout}
      />
    </SurfaceMount>
  );

  const digest = (
    <SurfaceMount surface="digest">
      <DigestSurface
        api={api}
        me={me}
        hasTavily={hasTavily}
        history={history}
        location={location}
        onOpenSettings={openSettings}
        onLogout={onLogout}
      />
    </SurfaceMount>
  );

  const media = (
    <SurfaceMount surface="media">
      <MediaSurface history={history} location={location} />
    </SurfaceMount>
  );

  return (
    <Routes>
      {isReactSurface(flags, 'dashboard') && <Route path="/" element={dashboard} />}
      {isReactSurface(flags, 'digest') && <Route path="/digest" element={digest} />}
      {isReactSurface(flags, 'digest') && <Route path="/digest/:id" element={digest} />}
      {isReactSurface(flags, 'media') && <Route path="/media" element={media} />}
      {isReactSurface(flags, 'media') && <Route path="/media/:channel" element={media} />}
    </Routes>
  );
}

const container = typeof document !== 'undefined' ? document.getElementById('root') : null;

if (container) {
  const api = createApiClient();

  // Apply the stored theme before first paint (the per-surface entries did the same).
  applyTheme(resolveTheme(readStoredTheme(safeStorage())), document.documentElement);

  function Root() {
    const [me, setMe] = useState<UserProfile | null>(null);

    useEffect(() => {
      let active = true;
      fetchMe(api).then((profile) => { if (active) setMe(profile); });
      return () => { active = false; };
    }, []);

    const logout = useCallback(async () => {
      try { await api.post('/api/logout'); } catch { /* already signed out */ }
      window.location.replace('/login');
    }, []);

    return <AppRoot api={api} me={me} onMeChange={setMe} onLogout={logout} />;
  }

  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}
