import { isRecord } from '../isRecord';
import type { ApiErrorKind } from './types';

const NO_LLM_RE = /No LLM/i;

function kindForPaymentOrBadRequest(body: unknown): ApiErrorKind {
  if (!isRecord(body)) return 'http';
  if (typeof body.error === 'string' && NO_LLM_RE.test(body.error)) return 'no-llm';
  if (body.budget === 'shared' || body.budget === 'none') return 'budget';
  return 'http';
}

export function kindForStatus(status: number, body: unknown): ApiErrorKind {
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
    case 402:
      return kindForPaymentOrBadRequest(body);
    default:
      return 'http';
  }
}

export function messageForStatus(status: number, body: unknown): string {
  if (isRecord(body) && typeof body.error === 'string') return body.error;
  return `Request failed with status ${status}`;
}
