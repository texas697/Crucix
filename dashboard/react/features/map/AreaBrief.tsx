// The area-brief stage, ported from `jarvis.html`: the `AB` state object / `resetAreaBrief` (1622-1628),
// `shapePayload` (1629-1632), `markersPayload` (1633-1639), `loadAreaBrief` (1640-1669) and
// `renderAreaBriefHtml` (1678-1719) plus `abAge`/`abCite`/`abFormatUsd`/`abLinkFor` (1670-1677).
//
// `renderAreaBriefHtml` returned an HTML string; here the equivalent tree is JSX, so citations are
// real React nodes and the `[n] → article[n-1]` links are rendered with the same title/url logic.
// `loadAreaBrief` keeps the legacy module-level "latest request" guard so an in-flight request is
// aborted when a new one starts, and every update is dropped if a newer request has begun.

import type { ReactNode } from 'react';
import type { ApiClient } from '../../api/client';
import type { Shape } from '../../state/url';
import type { MapPoint } from './plot';
import { LAYER_DEFS } from './layerDefs';

// ─── Payload / response shapes (server.mjs `/api/map/region` and lib/map/region-news.mjs) ────────

export interface AbPlace {
  name: string;
  lat?: number;
  lon?: number;
  [key: string]: unknown;
}

export interface AbArticle {
  id?: string;
  url?: string;
  title?: string;
  source?: string;
  publishedAt?: string;
  via?: string;
  [key: string]: unknown;
}

export interface AbBrief {
  headline?: string;
  summary?: string;
  developments?: string[];
  watch?: string;
  tone?: string;
  [key: string]: unknown;
}

export interface AbLlm {
  keyOwner?: string;
  provider?: string;
  model?: string;
  costUsd?: number | null;
  costLabel?: string;
  costExact?: boolean;
  inputPerM?: number;
  outputPerM?: number;
  inputTokens?: number;
  outputTokens?: number;
  [key: string]: unknown;
}

/** A marker summary sent with the brief request (legacy `markersPayload`). */
export interface AreaBriefMarkers {
  counts: Record<string, number>;
  samples: string[];
}

/** The `AB` state object (legacy `AB`, jarvis.html 1622). */
export interface AreaBriefState {
  status: 'idle' | 'loading' | 'ready';
  places: AbPlace[];
  fallback: boolean;
  articles: AbArticle[];
  total: number;
  brief: AbBrief | null;
  llm: AbLlm | null;
  error: string | null;
  errorKind: string | null;
  briefLoading: boolean;
}

/** The idle state (legacy `resetAreaBrief`). */
export const EMPTY_AREA_BRIEF: AreaBriefState = {
  status: 'idle',
  places: [],
  fallback: false,
  articles: [],
  total: 0,
  brief: null,
  llm: null,
  error: null,
  errorKind: null,
  briefLoading: false,
};

interface AbResponse extends Partial<AreaBriefState> {
  error?: string;
  budget?: string;
}

// ─── Pure payload helpers ────────────────────────────────────────────────────────────────────────

const round4 = (v: number): number => +v.toFixed(4);

/** The `shape` field of the region request (legacy `shapePayload`). */
export function shapePayload(shape: Shape): unknown {
  if (shape.kind === 'circle') {
    return { kind: 'circle', center: { lat: shape.center.lat, lng: shape.center.lng }, radiusKm: shape.radiusKm };
  }
  if (shape.kind === 'rect') {
    return {
      kind: 'polygon',
      ring: [
        [round4(shape.sw.lng), round4(shape.sw.lat)],
        [round4(shape.ne.lng), round4(shape.sw.lat)],
        [round4(shape.ne.lng), round4(shape.ne.lat)],
        [round4(shape.sw.lng), round4(shape.ne.lat)],
      ],
    };
  }
  return { kind: 'polygon', ring: shape.ring.map((p) => [round4(p.lng), round4(p.lat)]) };
}

/** Per-layer counts plus up to 14 representative samples (legacy `markersPayload`). */
export function markersPayload(items: MapPoint[]): AreaBriefMarkers {
  const counts: Record<string, number> = {};
  items.forEach((p) => {
    counts[p.type] = (counts[p.type] || 0) + 1;
  });
  const labelFor = (type: string): string => LAYER_DEFS.find((l) => l.key === type)?.label || type;
  const samples = [...items]
    .sort((a, b) => (a.priority || 9) - (b.priority || 9))
    .slice(0, 14)
    .map((p) => {
      const head = (p.popHead || '').replace(/<[^>]+>/g, '');
      const meta = p.popMeta ? ' — ' + String(p.popMeta).replace(/<[^>]+>/g, '') : '';
      return `${labelFor(p.type)}: ${head}${meta}`;
    });
  return { counts, samples };
}

// ─── Two-stage loader ────────────────────────────────────────────────────────────────────────────

// The legacy module-level `abAbort`/`abSeq` guards. Only one area brief loads at a time; starting a
// new one aborts the previous request and every late response is discarded by the sequence check.
let abCurrent: AbortController | null = null;
let abSeq = 0;

export interface LoadAreaBriefOptions {
  shape: Shape;
  markers: AreaBriefMarkers;
  /** External cancellation (e.g. component unmount); aborts the internal controller. */
  signal?: AbortSignal;
  onUpdate?: (patch: Partial<AreaBriefState>) => void;
  onError?: (error: { message: string; kind: string }) => void;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function errorKind(err: unknown, fallback: string): string {
  const body = (err as { body?: unknown } | null)?.body;
  if (isRecord(body) && typeof body.budget === 'string') return body.budget;
  return fallback;
}

/**
 * POST the shape/markers to `/api/map/region` twice — `articles` (places + headlines, no AI) then
 * `brief` (the LLM write-up) — reporting each stage through `onUpdate`. Aborts any previous request.
 */
export async function loadAreaBrief(api: ApiClient, options: LoadAreaBriefOptions): Promise<void> {
  const { shape, markers, signal, onUpdate, onError } = options;

  if (abCurrent) abCurrent.abort();
  const ctrl = new AbortController();
  abCurrent = ctrl;
  const seq = ++abSeq;

  const onExternalAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', onExternalAbort);
  }

  onUpdate?.({
    status: 'loading',
    places: [],
    fallback: false,
    articles: [],
    total: 0,
    brief: null,
    llm: null,
    error: null,
    errorKind: null,
    briefLoading: true,
  });

  const post = (mode: 'articles' | 'brief'): Promise<AbResponse> =>
    api.post<AbResponse>('/api/map/region', { shape, markers, mode }, { signal: ctrl.signal });

  try {
    // 1) Places + headlines: fast, no AI.
    let d1: AbResponse;
    try {
      d1 = await post('articles');
    } catch (err) {
      if (ctrl.signal.aborted || seq !== abSeq) return;
      const message = errorMessage(err, 'Lookup failed');
      onError?.({ message, kind: 'lookup' });
      onUpdate?.({ status: 'ready', error: message, errorKind: 'lookup', briefLoading: false });
      return;
    }
    if (seq !== abSeq) return;
    onUpdate?.({
      status: 'ready',
      places: d1.places || [],
      fallback: !!d1.fallback,
      articles: d1.articles || [],
      total: d1.total || 0,
      error: null,
      errorKind: null,
    });

    // 2) The brief itself.
    let d2: AbResponse;
    try {
      d2 = await post('brief');
    } catch (err) {
      if (ctrl.signal.aborted || seq !== abSeq) return;
      const message = errorMessage(err, 'Brief failed');
      const kind = errorKind(err, 'llm');
      onError?.({ message, kind });
      onUpdate?.({ error: message, errorKind: kind });
      return;
    }
    if (seq !== abSeq) return;
    const patch: Partial<AreaBriefState> = { brief: d2.brief || null, llm: d2.llm || null, error: null, errorKind: null };
    if (d2.articles) patch.articles = d2.articles;
    if (d2.total) patch.total = d2.total;
    onUpdate?.(patch);
  } finally {
    if (seq === abSeq) {
      if (abCurrent === ctrl) abCurrent = null;
      onUpdate?.({ briefLoading: false });
    }
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

// ─── Formatting helpers (legacy 1670-1677) ──────────────────────────────────────────────────────

export function abAge(d: unknown): string {
  if (!d) return '';
  const h = (Date.now() - new Date(String(d)).getTime()) / 3600000;
  if (!(h >= 0)) return '';
  if (h < 1) return 'just now';
  if (h < 24) return Math.floor(h) + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export function abFormatUsd(u: number | null | undefined): string | null {
  if (u == null) return null;
  if (u === 0) return '$0.0000';
  if (u < 0.0001) return '<$0.0001';
  return '$' + u.toFixed(u < 0.01 ? 4 : u < 1 ? 3 : 2);
}

export function abLinkFor(a: AbArticle): string {
  return a.id ? `/digest?open=${encodeURIComponent(a.id)}` : (a.url || '#');
}

/** Replace `[n]` with a clickable citation chip pointing at `articles[n-1]` (legacy `abCite`). */
function renderCite(text: string | undefined, articles: AbArticle[]): ReactNode {
  const src = text ?? '';
  const nodes: ReactNode[] = [];
  const re = /\[(\d{1,2})\]/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) nodes.push(src.slice(last, m.index));
    const n = Number(m[1]);
    const a = articles[n - 1];
    if (a) {
      nodes.push(
        <a
          className="ab-cite"
          key={`cite-${key++}`}
          href={abLinkFor(a)}
          target="_blank"
          rel="noopener noreferrer"
          title={`${a.source || ''}: ${a.title || ''}`}
          onMouseEnter={() => document.getElementById(`abn${n}`)?.classList.add('hl')}
          onMouseLeave={() => document.getElementById(`abn${n}`)?.classList.remove('hl')}
        >
          {n}
        </a>,
      );
    } else {
      nodes.push(m[0]);
    }
    last = m.index + m[0].length;
  }
  if (last < src.length) nodes.push(src.slice(last));
  return nodes;
}

function skeleton(kind: 'loading' | 'brief'): ReactNode[] {
  const widths = kind === 'loading' ? ['w1', 'w2', 'w3', 'w4'] : ['w1', 'w2', 'w3'];
  return widths.map((w) => <div className={`ab-sk ${w}`} key={w} />);
}

// ─── Component ───────────────────────────────────────────────────────────────────────────────────

export interface AreaBriefProps {
  state: AreaBriefState;
  /** Offered on the error state so the parent can re-run `loadAreaBrief`. */
  onRetry?: () => void;
}

export function AreaBrief({ state, onRetry }: AreaBriefProps) {
  if (state.status === 'idle') return null;

  const placeNames = state.places.map((p) => p.name);
  const placesHtml = placeNames.length ? (
    <span className={`ab-places${state.fallback ? ' fb' : ''}`} title={placeNames.join(', ')}>
      {state.fallback ? 'near ' : ''}
      {placeNames.slice(0, 6).join(' · ')}
      {placeNames.length > 6 ? ` +${placeNames.length - 6}` : ''}
    </span>
  ) : state.status === 'loading' ? null : (
    <span className="ab-places fb">open water / unmapped area</span>
  );

  const body: ReactNode[] = [];
  if (state.status === 'loading') {
    body.push(
      <div className="ab-status" key="status"><span className="pulse" />Finding places and headlines…</div>,
      ...skeleton('loading'),
    );
  } else {
    if (state.brief) {
      const b = state.brief;
      body.push(<div className="ab-head" key="head">{b.headline}</div>);
      if (b.summary) body.push(<p className="ab-sum" key="sum">{renderCite(b.summary, state.articles)}</p>);
      if (b.developments?.length) {
        body.push(
          <ul className="ab-dev" key="dev">
            {b.developments.map((d, i) => <li key={i}>{renderCite(d, state.articles)}</li>)}
          </ul>,
        );
      }
      if (b.watch) body.push(<div className="ab-watch" key="watch"><b>Watch</b>{renderCite(b.watch, state.articles)}</div>);
    } else if (state.briefLoading) {
      body.push(
        <div className="ab-status" key="status"><span className="pulse" />Writing the brief…</div>,
        ...skeleton('brief'),
      );
    } else if (state.error) {
      body.push(
        <div className="ab-err" key="err">
          {state.error}
          {onRetry && <button className="ab-retry" type="button" onClick={onRetry}>Retry</button>}
        </div>,
      );
    }

    if (state.articles.length) {
      body.push(
        <div className="ab-news-h" key="news">
          Recent coverage
          <span>{state.total > state.articles.length ? `${state.articles.length} of ${state.total}` : state.articles.length}</span>
        </div>,
      );
      state.articles.forEach((a, i) => {
        body.push(
          <a className="ab-item" id={`abn${i + 1}`} key={`item-${i}`} href={abLinkFor(a)} target="_blank" rel="noopener noreferrer">
            <span className="ab-it"><span className="n">{i + 1}</span>{a.title}</span>
            <span className="ab-im">
              {a.source || ''}
              {a.publishedAt ? ' · ' + abAge(a.publishedAt) : ''}
              {a.via === 'live' ? <> · <span className="live">live</span></> : a.id ? ' · in digest' : ''}
            </span>
          </a>,
        );
      });
    } else if (state.status === 'ready' && !state.briefLoading && !state.brief) {
      body.push(<div className="sel-summary" key="none">No recent headlines match this area.</div>);
    }

    if (state.llm) {
      const l = state.llm;
      const cost = l.costLabel || abFormatUsd(l.costUsd);
      const who = l.keyOwner === 'user' ? <b>Your AI key</b> : <b>Site AI key</b>;
      const model = `${l.provider || ''}${l.model ? ' · ' + l.model : ''}`;
      const costTxt = cost
        ? <>this brief <span className="cost">{cost}</span>{l.costExact ? '' : ' est.'}</>
        : 'cost unavailable for this model';
      body.push(
        <div className="ab-foot" key="foot">
          <span className="ic">{l.keyOwner === 'user' ? '\u{1F511}' : '\u26A1'}</span>
          <span>{who} · {model} · {costTxt}.</span>
        </div>,
      );
    }
  }

  const tone = state.brief?.tone || 'calm';
  return (
    <div className={`ab tone-${tone}`}>
      <div className="ab-top">
        <span className="ab-kicker">Area brief</span>
        {placesHtml}
      </div>
      {body}
    </div>
  );
}
