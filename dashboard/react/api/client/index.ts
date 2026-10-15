import { ApiError } from './apiError';
import { kindForStatus, messageForStatus } from './errorMapping';
import { readJsonOrText, readTextOrEmpty } from './responseBody';
import type { ApiClient, ApiClientOptions, ReadOptions, RequestOptions } from './types';

function jsonRequestInit(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  const headers: Record<string, string> = {};
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  return { method, headers, body: payload, credentials: 'same-origin', signal };
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await readTextOrEmpty(res);
  if (text === '') return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new ApiError('parse', res.status, 'Invalid JSON response', err);
  }
}

export function createApiClient({ fetchImpl = fetch, origin = '' }: ApiClientOptions = {}): ApiClient {
  async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, signal, expectJson = true } = options;
    let res: Response;
    try {
      res = await fetchImpl(origin + path, jsonRequestInit(method, body, signal));
    } catch (err) {
      if (signal?.aborted) throw new ApiError('network', 0, 'Request aborted', err);
      throw new ApiError('network', 0, 'Network request failed', err);
    }
    if (!res.ok) {
      const parsed = await readJsonOrText(res);
      throw new ApiError(kindForStatus(res.status, parsed), res.status, messageForStatus(res.status, parsed), parsed);
    }
    if (!expectJson) return res as unknown as T;
    return parseJsonResponse<T>(res);
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

export { ApiError } from './apiError';
export type { ApiClient, ApiClientOptions, ApiErrorKind, ReadOptions, RequestOptions } from './types';
