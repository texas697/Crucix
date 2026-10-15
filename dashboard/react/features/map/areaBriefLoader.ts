import type { ApiClient } from '../../api/client';
import type { Shape } from '../../state/url';
import type { AbResponse, AreaBriefMarkers, AreaBriefState } from './areaBriefTypes';

let abCurrent: AbortController | null = null;
let abSeq = 0;

export interface LoadAreaBriefOptions {
  shape: Shape;
  markers: AreaBriefMarkers;
  signal?: AbortSignal;
  onUpdate?: (patch: Partial<AreaBriefState>) => void;
  onError?: (error: { message: string; kind: string }) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

const LOADING_PATCH: Partial<AreaBriefState> = {
  status: 'loading', places: [], isFallback: false, articles: [], total: 0, brief: null, llm: null, error: null, errorKind: null, isBriefLoading: true,
};

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

  onUpdate?.(LOADING_PATCH);

  const post = (mode: 'articles' | 'brief'): Promise<AbResponse> =>
    api.post<AbResponse>('/api/map/region', { shape, markers, mode }, { signal: ctrl.signal });

  try {
    let articles: AbResponse;
    try {
      articles = await post('articles');
    } catch (err) {
      if (ctrl.signal.aborted || seq !== abSeq) return;
      const message = errorMessage(err, 'Lookup failed');
      onError?.({ message, kind: 'lookup' });
      onUpdate?.({ status: 'ready', error: message, errorKind: 'lookup', isBriefLoading: false });
      return;
    }
    if (seq !== abSeq) return;
    onUpdate?.({
      status: 'ready',
      places: articles.places || [],
      isFallback: !!articles.fallback,
      articles: articles.articles || [],
      total: articles.total || 0,
      error: null,
      errorKind: null,
    });

    let brief: AbResponse;
    try {
      brief = await post('brief');
    } catch (err) {
      if (ctrl.signal.aborted || seq !== abSeq) return;
      const message = errorMessage(err, 'Brief failed');
      const kind = errorKind(err, 'llm');
      onError?.({ message, kind });
      onUpdate?.({ error: message, errorKind: kind });
      return;
    }
    if (seq !== abSeq) return;
    const patch: Partial<AreaBriefState> = { brief: brief.brief || null, llm: brief.llm || null, error: null, errorKind: null };
    if (brief.articles) patch.articles = brief.articles;
    if (brief.total) patch.total = brief.total;
    onUpdate?.(patch);
  } finally {
    if (seq === abSeq) {
      if (abCurrent === ctrl) abCurrent = null;
      onUpdate?.({ isBriefLoading: false });
    }
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}
