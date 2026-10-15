import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../../api/client';
import type { UserProfile } from '../../api/types';
import { renderMarkdown } from '../../shared/markdown';
import { safeExternalUrl } from '../../shared/safeUrl';

// The shared article reader, ported from dashboard/public/js/reader.js. Unlike the legacy version it
// takes explicit api/session/settings callbacks instead of reading host globals, so the dashboard and
// digest can both mount it. It is sequence-guarded so a slow response for article A can never replace
// article B after a rapid switch, and it never POSTs on render.

export interface ResearchState {
  state: 'none' | 'running' | 'done' | 'error';
  stage?: string;
  progress?: number;
  markdown?: string;
  model?: string;
  completedAt?: string;
  error?: string;
}

export interface Article {
  id: string | null;
  url?: string | null;
  title?: string;
  source?: string;
  vote?: number;
  kind?: string;
  author?: string;
  publishedAt?: string;
  description?: string;
  summaryMd?: string;
  summarizedBy?: string;
  summaryModel?: string;
  extracted?: boolean;
  topics?: string[];
  research?: ResearchState;
}

export interface ReaderTarget { id?: string; url?: string }

export interface ReaderProps {
  /** null closes the reader. A change of id/url loads a new article. */
  target: ReaderTarget | null;
  api: ApiClient;
  me: UserProfile | null;
  hasTavily: boolean;
  onClose: () => void;
  onResolved?: (id: string, url?: string | null) => void;
  onVote?: (id: string, rating: number) => void;
  onTopic?: (topic: string) => void;
  /** Host's settings callback — on the digest this navigates to /?settings=1. */
  onOpenSettings: () => void;
  pollMs?: number;
  now?: () => number;
}

function ago(iso: string | undefined, nowMs: number): string {
  if (!iso) return '';
  const ms = nowMs - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STAGE_LABEL: Record<string, string> = {
  searching: 'Searching related coverage…',
  reading: 'Reading sources…',
  synthesizing: 'Your model is writing the deep dive…',
};

export function Reader({
  target, api, me, hasTavily, onClose, onResolved, onVote, onTopic, onOpenSettings,
  pollMs = 2500, now = Date.now,
}: ReaderProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const seqRef = useRef(0);
  const openRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);

  const id = target?.id ?? null;
  const url = target?.url ?? null;
  const isOpen = target !== null;

  // Load the article whenever the target changes; ignore stale responses.
  useEffect(() => {
    if (!isOpen) {
      seqRef.current += 1;
      setArticle(null);
      setStatus('idle');
      setError('');
      return;
    }
    const seq = ++seqRef.current;
    setStatus('loading');
    setError('');
    setArticle({ id, url, title: undefined, vote: 0 });
    (async () => {
      try {
        const loaded = id
          ? await api.get<Article>(`/api/digest/article/${encodeURIComponent(id)}`)
          : await api.post<Article>('/api/digest/open', { url, title: undefined, source: undefined });
        if (seq !== seqRef.current) return;
        setArticle(loaded);
        setStatus('idle');
        if (!id && loaded.id) onResolved?.(loaded.id, url ?? loaded.url ?? null);
      } catch (err) {
        if (seq !== seqRef.current) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Could not load the article');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, url, isOpen]);

  // Research polling: only while running, cancelled on close/unmount/target change. Self-scheduling
  // because the running dependency does not change between polls.
  useEffect(() => {
    if (article?.research?.state !== 'running' || !article.id) return;
    const articleId = article.id;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await api.get<ResearchState>(`/api/digest/${encodeURIComponent(articleId)}/research`);
        if (cancelled) return;
        setArticle((cur) => (cur && cur.id === articleId ? { ...cur, research: r } : cur));
        if (r.state === 'running') timer = setTimeout(tick, pollMs);
      } catch {
        if (cancelled) return;
        setArticle((cur) => (cur && cur.id === articleId ? { ...cur, research: { state: 'error', error: 'research poll failed' } } : cur));
      }
    };
    timer = setTimeout(tick, pollMs);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [article?.research?.state, article?.id, api, pollMs]);

  // Escape closes; focus moves into the dialog and is restored on unmount.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  const vote = useCallback(async (rating: number) => {
    if (!article?.id) return;
    try {
      const r = await api.post<{ rating: number }>(`/api/digest/${encodeURIComponent(article.id)}/feedback`, { rating });
      setArticle((cur) => (cur ? { ...cur, vote: r.rating } : cur));
      onVote?.(article.id, r.rating);
    } catch { /* rating is best-effort */ }
  }, [article?.id, api, onVote]);

  const summarize = useCallback(async () => {
    if (!article?.id || busyRef.current) return;
    busyRef.current = true;
    try {
      const updated = await api.post<Article>(`/api/digest/${encodeURIComponent(article.id)}/summarize`);
      setArticle((cur) => (cur && cur.id === article.id ? { ...cur, ...updated } : cur));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Write-up failed');
    } finally {
      busyRef.current = false;
    }
  }, [article?.id, api]);

  const startResearch = useCallback(async () => {
    if (!article?.id || busyRef.current) return;
    busyRef.current = true;
    const articleId = article.id;
    setArticle((cur) => (cur ? { ...cur, research: { state: 'running', stage: 'searching', progress: 3 } } : cur));
    try {
      await api.post(`/api/digest/${encodeURIComponent(articleId)}/research`);
    } catch (err) {
      setArticle((cur) => (cur && cur.id === articleId ? { ...cur, research: { state: 'error', error: err instanceof Error ? err.message : 'failed' } } : cur));
    } finally {
      busyRef.current = false;
    }
  }, [article?.id, api]);

  if (!isOpen) return null;

  const nowMs = now();
  const originalHref = safeExternalUrl(article?.url) ?? undefined;
  const hasKey = !!me?.llm;
  const authed = !!me;

  return (
    <div className="crucix-surface reader-overlay" data-surface="reader" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rd-modal" role="dialog" aria-modal="true" aria-label={article?.title || 'Article'}>
        <div className="rd-head">
          <div className="rd-meta">
            <div className="rd-kicker">
              {article?.source && <span className="rd-src">{article.source}</span>}
              {article?.kind === 'thinktank' && <span>Think tank</span>}
              {article?.publishedAt && <span>{ago(article.publishedAt, nowMs)}</span>}
              {article?.author && <span>{article.author}</span>}
            </div>
            <div className="rd-title">{article?.title || '(untitled)'}</div>
          </div>
          <div className="rd-actions">
            <span className="rd-thumbs-label" id="rd-rate-label">Rate</span>
            <div className="rd-thumbs" role="group" aria-labelledby="rd-rate-label">
              <button type="button" className={`rd-thumb up${(article?.vote ?? 0) > 0 ? ' on' : ''}`} aria-pressed={(article?.vote ?? 0) > 0} aria-label="More like this" onClick={() => vote(1)}>👍</button>
              <button type="button" className={`rd-thumb down${(article?.vote ?? 0) < 0 ? ' on' : ''}`} aria-pressed={(article?.vote ?? 0) < 0} aria-label="Less like this" onClick={() => vote(-1)}>👎</button>
            </div>
            {originalHref && <a className="rd-btn" href={originalHref} target="_blank" rel="noopener noreferrer">Original ↗</a>}
            <button ref={openRef} type="button" className="rd-btn rd-close" aria-label="Close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="rd-body">
          {status === 'loading' && <div className="rd-loading">{id ? 'LOADING…' : 'FETCHING ARTICLE…'}</div>}
          {status === 'error' && (
            <div className="rd-note err">
              {error}
              {originalHref && <div><a className="rd-btn" href={originalHref} target="_blank" rel="noopener noreferrer">Open original ↗</a></div>}
            </div>
          )}
          {status === 'idle' && article && (
            <ArticleBody
              article={article}
              authed={authed}
              hasKey={hasKey}
              hasTavily={hasTavily}
              nowMs={nowMs}
              onTopic={onTopic}
              onSummarize={summarize}
              onResearch={startResearch}
              onOpenSettings={onOpenSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface BodyProps {
  article: Article;
  authed: boolean;
  hasKey: boolean;
  hasTavily: boolean;
  nowMs: number;
  onTopic?: (topic: string) => void;
  onSummarize: () => void;
  onResearch: () => void;
  onOpenSettings: () => void;
}

function ArticleBody({ article, authed, hasKey, hasTavily, nowMs, onTopic, onSummarize, onResearch, onOpenSettings }: BodyProps) {
  const research = article.research;
  return (
    <>
      <div className="rd-topics">
        {(article.topics ?? []).map((t) => (
          <button key={t} type="button" className="rd-topic" onClick={() => onTopic?.(t)}>{t}</button>
        ))}
      </div>
      <div className="rd-writeup">
        {article.summarizedBy
          ? <>{renderMarkdown(article.summaryMd)}<div className="rd-note">Write-up by {article.summaryModel || 'AI'} · {article.summarizedBy === 'operator' ? 'site model' : 'your key'}</div></>
          : <>
              {renderMarkdown(article.summaryMd || article.description || '')}
              {!article.extracted && <div className="rd-note">Only a short excerpt could be read from this publisher (paywall or bot wall). Use <b>Original</b> for the full piece.</div>}
              {authed && hasKey && <button type="button" className="rd-btn primary" onClick={onSummarize}>⚡ Write this up with my AI</button>}
              {authed && !hasKey && <KeyCta what="The AI write-up" onOpenSettings={onOpenSettings} />}
            </>}
      </div>
      <div className="rd-section">
        <h2>Read more about it</h2>
        {research?.state === 'done' && research.markdown && (
          <>{renderMarkdown(research.markdown)}<div className="rd-note">Deep dive by {research.model || 'your model'} · {ago(research.completedAt, nowMs)}</div></>
        )}
        {research?.state === 'running' && (
          <div>
            <div className="rd-note">{STAGE_LABEL[research.stage ?? ''] ?? 'Working…'}</div>
            <div className="rd-progress" role="progressbar" aria-valuenow={research.progress ?? 5} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${research.progress ?? 5}%` }} />
            </div>
            <div className="rd-note">Usually 30–90 seconds. You can close this and come back; the result is saved to your account.</div>
          </div>
        )}
        {(!research || research.state === 'none' || research.state === 'error') && (
          <>
            <p className="rd-note">
              Pulls the latest related coverage from across the web (GDELT{hasTavily ? ' + Tavily' : ''}), reads it,
              and has your model write a cited companion: background, actors, competing interpretations, implications.
            </p>
            {research?.state === 'error' && <div className="rd-note err">Last attempt failed: {research.error || 'unknown error'}</div>}
            {authed && hasKey && <button type="button" className="rd-btn primary" onClick={onResearch}>🔍 Read more about it</button>}
            {authed && !hasKey && <KeyCta what="“Read more about it”" onOpenSettings={onOpenSettings} />}
          </>
        )}
      </div>
    </>
  );
}

function KeyCta({ what, onOpenSettings }: { what: string; onOpenSettings: () => void }) {
  return (
    <div className="rd-cta">
      <div className="big">⚡ ADD YOUR AI KEY</div>
      <p>{what} runs on your own LLM key. Enter it once and it is used only for your requests.</p>
      <button type="button" className="rd-btn primary" onClick={onOpenSettings}>Enter API key</button>
    </div>
  );
}
