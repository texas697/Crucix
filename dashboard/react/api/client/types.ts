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

export interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  expectJson?: boolean;
}

export type ReadOptions = Omit<RequestOptions, 'method' | 'body'>;

export interface ApiClient {
  request<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  get<T = unknown>(path: string, options?: ReadOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: ReadOptions): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, options?: ReadOptions): Promise<T>;
  del<T = unknown>(path: string, options?: ReadOptions): Promise<T>;
}

export interface ApiClientOptions {
  fetchImpl?: typeof fetch;
  origin?: string;
}
