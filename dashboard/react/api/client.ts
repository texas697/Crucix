// Same-origin API client for the browser surfaces. No server-only imports: this module is safe to
// bundle into the React tree.
//
// Error mapping is the important part. The backend overloads HTTP status codes to carry meaning the
// UI acts on:
//   - 401 -> session-expired (re-auth). A 404 from `/api/me` is a *different* case: auth is off, so
//     the client is in local mode and must NOT be treated as a logout.
//   - 400/402 -> distinguish "no LLM configured/key" and "budget exhausted" from generic errors by
//     reading the JSON body.
//   - 503 -> the first sweep is still running ("starting").
// Request bodies and headers are never logged.

/** Every way a request can fail, as understood by the UI. */
export type ApiErrorKind =
  | 'session-expired'
  | 'forbidden'
  | 'not-found'
  | 'rate-limited'
  | 'no-llm'
  | 'budget'
  | 'starting'
  | 'http'
  | 'network'
  | 'parse';

/** Error thrown by {@link createApiClient}. Carries the HTTP status, a semantic kind, and the body. */
export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly body: unknown;

  constructor(kind: ApiErrorKind, status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.body = body;
  }
}

/** Per-request options for {@link ApiClient.request}. */
export interface RequestOptions {
  method?: string;
  /** Request body; serialized as JSON and sets `Content-Type: application/json` when present. */
  body?: unknown;
  signal?: AbortSignal;
  /** When false, resolves with the raw {@link Response} instead of parsing JSON. Defaults to true. */
  expectJson?: boolean;
}

type ReadOptions = Omit<RequestOptions, 'method' | 'body'>;

/** The same-origin API surface handed to the rest of the app. */
export interface ApiClient {
  request<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  get<T = unknown>(path: string, options?: ReadOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: ReadOptions): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, options?: ReadOptions): Promise<T>;
  del<T = unknown>(path: string, options?: ReadOptions): Promise<T>;
}

/** Construction options for {@link createApiClient}. */
export interface ApiClientOptions {
  /** Override for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Optional origin prefix (e.g. `https://example.com`) prepended to every path. */
  origin?: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function kindForStatus(status: number, body: unknown): ApiErrorKind {
  switch (status) {
    case 401:
      return 'session-expired';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    case 429:
      return 'rate-limited';
    case 503:
      return 'starting';
    case 400:
    case 402: {
      if (isRecord(body)) {
        const error = body.error;
        if (typeof error === 'string' && /No LLM/i.test(error)) return 'no-llm';
        const budget = body.budget;
        if (budget === 'shared' || budget === 'none') return 'budget';
      }
      return 'http';
    }
    default:
      return 'http';
  }
}

function messageFor(status: number, body: unknown): string {
  if (isRecord(body) && typeof body.error === 'string') return body.error;
  return `Request failed with status ${status}`;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/** Best-effort body read: JSON when it parses, otherwise the raw text (or undefined when empty). */
async function readBody(res: Response): Promise<unknown> {
  const text = await safeText(res);
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Creates a same-origin API client. `get`/`post`/`put`/`del` are thin wrappers over `request`.
 */
export function createApiClient({ fetchImpl = fetch, origin = '' }: ApiClientOptions = {}): ApiClient {
  async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, signal, expectJson = true } = options;

    const headers: Record<string, string> = {};
    let payload: string | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await fetchImpl(origin + path, {
        method,
        headers,
        body: payload,
        credentials: 'same-origin',
        signal,
      });
    } catch (err) {
      // An aborted request is a cancellation, not a server error.
      if (signal?.aborted) throw new ApiError('network', 0, 'Request aborted', err);
      throw new ApiError('network', 0, 'Network request failed', err);
    }

    if (!res.ok) {
      const parsed = await readBody(res);
      throw new ApiError(kindForStatus(res.status, parsed), res.status, messageFor(res.status, parsed), parsed);
    }

    if (!expectJson) return res as unknown as T;

    const text = await safeText(res);
    if (text === '') return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new ApiError('parse', res.status, 'Invalid JSON response', err);
    }
  }

  return {
    request,
    get: <T = unknown>(path: string, options?: ReadOptions) => request<T>(path, { ...options, method: 'GET' }),
    post: <T = unknown>(path: string, body?: unknown, options?: ReadOptions) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T = unknown>(path: string, body?: unknown, options?: ReadOptions) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    del: <T = unknown>(path: string, options?: ReadOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  };
}
