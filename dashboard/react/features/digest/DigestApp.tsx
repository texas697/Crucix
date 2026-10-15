import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, type ApiClient } from '../../api/client';
import type { UserProfile } from '../../api/types';
import type { HistoryAdapter } from '../../state/history';
import { parseUrl } from '../../state/url';
import { Reader } from '../reader/Reader';

// The Readers Digest feed, ported from dashboard/public/digest.html. It owns the filter/topic/search
// state (seeded from the URL), the list request, the topic/taste summaries and the card grid, and it
// mounts the shared Reader for the open article. The URL is the source of truth: filters push history
// entries, search replaces in place, and opening an article pushes a 'read' entry the Back button can
// undo. No request is made during render, and every slow response is discarded by a sequence guard so
// it can never overwrite a newer one.

const FILTER_VALUES = ['all', 'foryou', 'thinktank', 'news'] as const;
type Filter = (typeof FILTER_VALUES)[number];

const FILTER_LABELS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'foryou', label: 'For you' },
  { value: 'thinktank', label: 'Think tanks' },
  { value: 'news', label: 'News' },
];

export interface DigestCardItem {
  id: string;
  source: string;
  kind?: string;
  title: string;
  description?: string;
  publishedAt?: string;
  hasWriteup?: boolean;
  topics?: string[];
  vote?: number;
}

export interface DigestTopicCount { topic: string; count: number }

export interface DigestListResponse {
  items: DigestCardItem[];
  topics?: DigestTopicCount[];
  total?: number;
  storeSize?: number;
  mode?: string;
  votes?: number;
  minVotesForAffinity?: number;
  taste?: { likes?: Array<{ topic: string } | string>; dislikes?: Array<{ topic: string } | string> };
}

export interface DigestAppProps {
  api: ApiClient;
  me: UserProfile | null;
  hasTavily: boolean;
  history: HistoryAdapter;
  location: { href: string; pathname: string; search: string };
  onOpenSettings: () => void;
  onLogout?: () => void;
  now?: () => number;
}

interface Route { id: string; filter: Filter; topic: string; q: string }
interface ViewState { filter: Filter; topic: string; q: string; openArticleId: string | null }

function isFilter(value: string | undefined): value is Filter {
  return value !== undefined && (FILTER_VALUES as readonly string[]).includes(value);
}

/** Read the filter/topic/search/open-article state out of the address bar. */
function routeFromUrl(href: string): Route {
  const { path, q } = parseUrl(href);
  return {
    id: path[1] || q.open || '',
    filter: isFilter(q.filter) ? q.filter : 'all',
    topic: q.topic || '',
    q: q.q || '',
  };
}

function ago(iso: string | undefined, nowMs: number): string {
  if (!iso) return '';
  const ms = nowMs - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusLine(r: DigestListResponse): string {
  const total = r.total ?? 0;
  const storeSize = r.storeSize ?? 0;
  const votes = r.votes ?? 0;
  const min = r.minVotesForAffinity ?? 0;
  const mode = r.mode === 'affinity'
    ? 'RANKED FOR YOU'
    : `CHRONOLOGICAL${votes < min ? ` (${min - votes} MORE RATINGS TO PERSONALISE)` : ''}`;
  return `${total} PIECES · ${storeSize} IN LIBRARY · ${mode}`;
}

function tasteTopics(list: Array<{ topic: string } | string> | undefined): string[] {
  return (list ?? []).map((l) => (typeof l === 'string' ? l : l.topic));
}

function isUnauthenticated(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 401) return true;
  return err instanceof Error && err.message.includes('unauthenticated');
}

export function DigestApp(props: DigestAppProps) {
  const { api, me, hasTavily, history, location, onOpenSettings, onLogout, now = Date.now } = props;

  const seedRef = useRef<Route | null>(null);
  if (seedRef.current === null) seedRef.current = routeFromUrl(location.href);
  const seed = seedRef.current;

  const [view, setView] = useState<ViewState>({
    filter: seed.filter,
    topic: seed.topic,
    q: seed.q,
    openArticleId: seed.id || null,
  });
  const [searchValue, setSearchValue] = useState(seed.q);
  const [items, setItems] = useState<DigestCardItem[]>([]);
  const [topics, setTopics] = useState<DigestTopicCount[]>([]);
  const [taste, setTaste] = useState<{ likes: string[]; dislikes: string[] }>({ likes: [], dislikes: [] });
  const [status, setStatus] = useState('');

  const viewRef = useRef<ViewState>(view);
  const loadSeq = useRef(0);
  const applyingRoute = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootRef = useRef(false);

  useEffect(() => { viewRef.current = view; }, [view]);

  const load = useCallback(async (filter: Filter, topic: string, q: string) => {
    const seq = ++loadSeq.current;
    setStatus('LOADING…');
    const params = new URLSearchParams({ filter, topic, q }).toString();
    try {
      const r = await api.get<DigestListResponse>(`/api/digest/list?${params}`);
      if (seq !== loadSeq.current) return;
      setItems(Array.isArray(r.items) ? r.items : []);
      setTopics(Array.isArray(r.topics) ? r.topics : []);
      setTaste({
        likes: tasteTopics(r.taste?.likes).slice(0, 6),
        dislikes: tasteTopics(r.taste?.dislikes).slice(0, 4),
      });
      setStatus(statusLine(r));
    } catch (err) {
      if (seq !== loadSeq.current) return;
      if (!isUnauthenticated(err)) {
        setStatus(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [api]);

  const syncUrl = useCallback((push: boolean, next: ViewState) => {
    if (applyingRoute.current) return;
    history.set(
      ['digest', next.openArticleId || ''],
      { filter: next.filter !== 'all' ? next.filter : '', topic: next.topic, q: next.q },
      { push, state: { k: next.openArticleId ? 'read' : 'list' } },
    );
  }, [history]);

  const applyRoute = useCallback((href: string, initial: boolean) => {
    const r = routeFromUrl(href);
    applyingRoute.current = true;
    try {
      const cur = viewRef.current;
      const listChanged = r.filter !== cur.filter || r.topic !== cur.topic || r.q !== cur.q;
      const next: ViewState = { filter: r.filter, topic: r.topic, q: r.q, openArticleId: r.id || null };
      viewRef.current = next;
      setView(next);
      setSearchValue(r.q);
      if (listChanged || initial) void load(r.filter, r.topic, r.q);
    } finally {
      applyingRoute.current = false;
    }
    if (initial) syncUrl(false, viewRef.current);
  }, [load, syncUrl]);

  // Initial route: load the seeded list and normalise a legacy ?open=<id> into the path form.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    applyRoute(location.href, true);
  }, [applyRoute, location.href]);

  useEffect(() => {
    const onPop = () => applyRoute(window.location.href, false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [applyRoute]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const chooseFilter = (filter: Filter) => {
    const next: ViewState = { ...viewRef.current, filter };
    viewRef.current = next;
    setView(next);
    syncUrl(true, next);
    void load(next.filter, next.topic, next.q);
  };

  const setTopic = (topic: string) => {
    const next: ViewState = { ...viewRef.current, topic, openArticleId: null };
    viewRef.current = next;
    setView(next);
    syncUrl(true, next);
    void load(next.filter, next.topic, next.q);
  };

  const toggleTopic = (topic: string) => {
    setTopic(viewRef.current.topic === topic ? '' : topic);
  };

  const onSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next: ViewState = { ...viewRef.current, q: value.trim() };
      viewRef.current = next;
      setView(next);
      syncUrl(false, next);
      void load(next.filter, next.topic, next.q);
    }, 250);
  };

  const openArticle = (id: string) => {
    const next: ViewState = { ...viewRef.current, openArticleId: id };
    viewRef.current = next;
    setView(next);
    syncUrl(true, next);
  };

  const closeReader = () => {
    if (!viewRef.current.openArticleId) return;
    const outcome = history.afterClose('read');
    const next: ViewState = { ...viewRef.current, openArticleId: null };
    viewRef.current = next;
    setView(next);
    if (outcome === 'rewrite') syncUrl(false, next);
  };

  const onResolved = (id: string) => {
    const next: ViewState = { ...viewRef.current, openArticleId: id };
    viewRef.current = next;
    setView(next);
    syncUrl(false, next);
  };

  const applyVote = (id: string, rating: number) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, vote: rating } : a)));
  };

  const rateFromCard = async (id: string, rating: number) => {
    try {
      const r = await api.post<{ rating: number }>(`/api/digest/${encodeURIComponent(id)}/feedback`, { rating });
      applyVote(id, typeof r?.rating === 'number' ? r.rating : rating);
    } catch (err) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const llm = (me?.llm ?? null) as { provider?: string } | null;
  const accountName = (me?.email || '').split('@')[0] ?? '';

  return (
    <>
      <div className="topbar">
        <a className="brand" href="/" title="Back to the dashboard">
          <img className="brand-logo brand-logo-dark" src="/brand/mfb-intelligence-navbar-dark-transparent.png" alt="MFB Services Intelligence" width={1124} height={160} />
          <img className="brand-logo brand-logo-light" src="/brand/mfb-intelligence-navbar-light-transparent.png" alt="" aria-hidden="true" width={1124} height={160} />
        </a>
        <nav className="mainnav">
          <a className="nav-tab" href="/">Dashboard</a>
          <a className="nav-tab active" href="/digest">Readers Digest</a>
          <a className="nav-tab" href="/media">Live media</a>
        </nav>
        <div className="spacer" />
        <div className="nav">
          {me && (llm
            ? <button type="button" className="pill" onClick={onOpenSettings}>AI KEY <span className="v">{(llm.provider || '').toUpperCase()}</span></button>
            : <button type="button" className="byok-cta" onClick={onOpenSettings}>⚡ Add your AI key</button>)}
          {me && onLogout && (
            <button type="button" className="pill" onClick={onLogout}>{accountName.toUpperCase()} <span className="v">EXIT</span></button>
          )}
        </div>
      </div>

      <div className="hero">
        <div>
          <h1>Readers Digest</h1>
          <p>Long-form analysis and reporting from think tanks and the policy press, written up for fast reading. Rate pieces and the feed learns what you care about. Open any piece for the AI write-up and a cited deep dive on your own key.</p>
        </div>
        <div className="status">{status}</div>
      </div>

      <div className="filters">
        <div className="seg" role="group" aria-label="Filter the digest">
          {FILTER_LABELS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`pill${view.filter === f.value ? ' active' : ''}`}
              data-filter={f.value}
              aria-pressed={view.filter === f.value}
              onClick={() => chooseFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          id="digest-search"
          type="search"
          value={searchValue}
          placeholder="Search titles, topics, write-ups"
          autoComplete="off"
          aria-label="Search titles, topics, write-ups"
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="topics">
        {topics.map((t) => (
          <button
            key={t.topic}
            type="button"
            className={`topic${view.topic === t.topic ? ' active' : ''}`}
            data-topic={t.topic}
            aria-pressed={view.topic === t.topic}
            onClick={() => toggleTopic(t.topic)}
          >
            {t.topic} <span>{t.count}</span>
          </button>
        ))}
      </div>

      {(taste.likes.length > 0 || taste.dislikes.length > 0) && (
        <div className="taste">
          <span>YOUR TASTE:</span>
          {taste.likes.map((t) => <b key={`like:${t}`}>+{t}</b>)}
          {taste.dislikes.map((t) => <span key={`dislike:${t}`} style={{ color: 'var(--danger)' }}>−{t}</span>)}
        </div>
      )}

      <div className="dg-grid" role="list">
        {items.length === 0 ? (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            NOTHING HERE YET.<br /><br />The library fills as the digest ingests feeds (every 30 minutes). Try ALL, or come back shortly.
          </div>
        ) : (
          items.map((a) => (
            <DigestCard key={a.id} article={a} now={now} onOpen={openArticle} onRate={rateFromCard} />
          ))
        )}
      </div>

      <Reader
        target={view.openArticleId ? { id: view.openArticleId } : null}
        api={api}
        me={me}
        hasTavily={hasTavily}
        onClose={closeReader}
        onOpenSettings={onOpenSettings}
        onResolved={onResolved}
        onVote={applyVote}
        onTopic={setTopic}
        now={now}
      />
    </>
  );
}

interface DigestCardProps {
  article: DigestCardItem;
  now: () => number;
  onOpen: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

function DigestCard({ article, now, onOpen, onRate }: DigestCardProps) {
  const vote = article.vote ?? 0;
  return (
    <div
      className={`dg-card${vote > 0 ? ' voted-up' : vote < 0 ? ' voted-down' : ''}`}
      data-id={article.id}
      role="listitem"
      onClick={() => onOpen(article.id)}
    >
      <div className="dg-top">
        <span className={`rd-src${article.kind === 'thinktank' ? ' thinktank' : ''}`}>{article.source}</span>
        <span>{article.publishedAt ? ago(article.publishedAt, now()) : ''}</span>
      </div>
      <div className="dg-title">{article.title}</div>
      <div className="dg-desc">{article.description || ''}</div>
      <div className="dg-foot">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {article.hasWriteup ? <span className="dg-tag ai">AI WRITE-UP</span> : null}
          {(article.topics ?? []).slice(0, 3).map((t) => <span className="dg-tag" key={t}>{t}</span>)}
        </div>
        <div className="dg-thumbs" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`rd-thumb up${vote > 0 ? ' on' : ''}`}
            title="More like this"
            aria-label="More like this"
            aria-pressed={vote > 0}
            onClick={(e) => { e.stopPropagation(); onRate(article.id, 1); }}
          >👍</button>
          <button
            type="button"
            className={`rd-thumb down${vote < 0 ? ' on' : ''}`}
            title="Less like this"
            aria-label="Less like this"
            aria-pressed={vote < 0}
            onClick={(e) => { e.stopPropagation(); onRate(article.id, -1); }}
          >👎</button>
        </div>
      </div>
    </div>
  );
}
