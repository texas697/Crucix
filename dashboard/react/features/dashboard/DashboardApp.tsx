import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiClient } from '../../api/client';
import type { HealthResponse, SweepData, UserProfile } from '../../api/types';
import { createTransport, shouldUseSse } from '../../api/transport';
import type { HistoryAdapter } from '../../state/history';
import { parseUrl } from '../../state/url';
import {
  applyTheme as applyThemeClass, persistTheme, readStoredTheme, resolveTheme, toggleTheme as flipTheme,
  type Theme,
} from '../../shared/theme';
import { PageShell } from '../../app/PageShell';
import { createTranslator } from '../../shared/locale';
import { Row } from './Panel';
import { SensorGrid, NuclearWatch, RiskGauges } from './panels/LeftRail';
import { SignalCore, SweepDelta, DisastersPanel, OutagesPanel } from './panels/RowB';
import { RowC } from './panels/RowC';
import { MarketsPanel } from './panels/RowE';
import { HealthWatchPanel } from './panels/HealthWatch';
import { RowD } from './panels/RowD';
import { StartupState } from './StartupState';
import { TopBar } from './TopBar';
import { NewsTicker, type TickerItem } from './NewsTicker';
import { SettingsOverlay } from '../settings/SettingsOverlay';

// The dashboard shell (P4a, partial). Owns the transport lifecycle, the startup/ready switch, the top
// bar, the settings overlay and a first feed panel. Panel groups and the map (P4b) land separately;
// the legacy dashboard stays authoritative until the whole surface passes parity.

export interface DashboardAppProps {
  api: ApiClient;
  me: UserProfile | null;
  history: HistoryAdapter;
  /** Initial location; popstate re-reads window.location when available. */
  location: { href: string; pathname: string; search: string };
  onMeChange: (me: UserProfile | null) => void;
  onLogout: () => void;
  now?: () => number;
}

function initialSettingsOpen(location: DashboardAppProps['location']): boolean {
  return parseUrl(location.href).q.settings === '1';
}

export function DashboardApp({ api, me, history, location, onMeChange, onLogout, now = Date.now }: DashboardAppProps) {
  const [data, setData] = useState<SweepData | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStoredTheme(safeStorage())));
  const [myIdeas, setMyIdeas] = useState<{ ideas?: unknown[]; provider?: string; generatedAt?: string } | null>(null);
  const settingsOpenedRef = useRef(false);

  // Theme: apply to <html> and persist on change.
  useEffect(() => {
    if (typeof document !== 'undefined') applyThemeClass(theme, document.documentElement);
    persistTheme(theme, safeStorage());
  }, [theme]);

  // One transport per mount; a 401 from its health poll is the session-expiry signal.
  useEffect(() => {
    const transport = createTransport({
      client: api,
      onData: setData,
      onHealth: setHealth,
      onSweepError: (err) => setSweepError(err instanceof Error ? err.message : String(err)),
      onSessionExpired: () => redirectToLogin(),
      sseEnabled: typeof location !== 'undefined' && shouldUseSse(locationHost()),
    });
    const stop = transport.start();
    return () => { stop(); transport.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
    history.set('/', { settings: '1' }, { push: true, state: { k: 'settings' } });
  }, [history]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    if (history.afterClose('settings') === 'rewrite') {
      history.set('/', {}, { push: false });
    }
  }, [history]);

  // `/?settings=1` opens the overlay once /api/me has resolved (auth-off renders no overlay).
  useEffect(() => {
    if (settingsOpenedRef.current) return;
    if (initialSettingsOpen(location) && me) {
      settingsOpenedRef.current = true;
      setSettingsOpen(true);
    }
  }, [location, me]);

  const tickerItems = useMemo<TickerItem[]>(() => {
    const feed = (data?.newsFeed as TickerItem[] | undefined) ?? (data?.news as TickerItem[] | undefined) ?? [];
    return Array.isArray(feed) ? feed : [];
  }, [data]);

  const meta = (data?.meta as SweepData['meta'] | undefined) ?? null;

  // The server injects the selected locale dictionary; panels fall back to English literals without it.
  const t = useMemo(() => {
    const dict = typeof window !== 'undefined'
      ? (window as unknown as { __CRUCIX_LOCALE__?: unknown }).__CRUCIX_LOCALE__
      : undefined;
    return dict ? createTranslator(dict) : undefined;
  }, []);

  // "Generate ideas now": without a key it opens settings; with one it POSTs /api/ideas and overlays
  // the user's ideas onto the shared payload (legacy applyUserIdeas).
  const generateIdeas = useCallback(async () => {
    if (!me?.llm) { openSettings(); return; }
    try {
      const payload = await api.post<{ ideas?: unknown[]; provider?: string; generatedAt?: string }>('/api/ideas');
      setMyIdeas(payload);
    } catch { /* the ideas panel keeps its own empty/BYOK state */ }
  }, [me, api, openSettings]);

  const panelData = useMemo<SweepData | null>(() => {
    if (!data) return null;
    if (myIdeas?.ideas?.length) {
      return { ...data, ideas: myIdeas.ideas, ideasSource: 'mine', ideasMeta: myIdeas } as SweepData;
    }
    return data;
  }, [data, myIdeas]);

  return (
    <PageShell surface="dashboard">
      <TopBar
        me={me}
        health={health}
        meta={meta}
        theme={theme}
        onToggleTheme={() => setTheme((t) => flipTheme(t))}
        onOpenSettings={openSettings}
        onLogout={onLogout}
        now={now}
      />
      {sweepError && <div className="sweep-error" role="alert">Sweep error: {sweepError}</div>}
      {!data || !panelData
        ? <StartupState health={health} now={now} />
        : (
          <main className="dashboard-main" id="main">
            <Row name="a">
              <SensorGrid data={panelData} t={t} />
              <NewsTicker items={tickerItems} now={now} />
              <HealthWatchPanel data={panelData} t={t} />
            </Row>
            <Row name="b">
              <SignalCore data={panelData} t={t} />
              <NuclearWatch data={panelData} t={t} />
              <RiskGauges data={panelData} t={t} />
              <SweepDelta data={panelData} t={t} />
              <DisastersPanel data={panelData} t={t} />
              <OutagesPanel data={panelData} t={t} />
            </Row>
            <Row name="c">
              <RowC data={panelData} t={t} me={me} onGenerateIdeas={generateIdeas} />
            </Row>
            <Row name="d">
              <RowD data={panelData} t={t} />
            </Row>
            <Row name="e">
              <MarketsPanel data={panelData} t={t} />
            </Row>
          </main>
        )}
      <SettingsOverlay
        open={settingsOpen}
        me={me}
        api={api}
        onClose={closeSettings}
        onProfileChange={onMeChange}
      />
    </PageShell>
  );
}

function locationHost(): string {
  return typeof location !== 'undefined' ? location.hostname : '';
}

function redirectToLogin(): void {
  if (typeof location === 'undefined') return;
  const here = location.pathname + location.search;
  location.replace(`/login?reason=expired&next=${encodeURIComponent(here)}`);
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
