import type { ApiClient } from '../../../api/client';
import { SESSION_PATH } from './consts';

export interface PostSessionArgs {
  api?: ApiClient;
  idToken: string;
}

function rejectionMessage(body: unknown, status: number): string {
  const error = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  return typeof error === 'string' ? error : `Server rejected session (${status})`;
}

async function postSessionViaFetch(idToken: string): Promise<void> {
  const res = await fetch(SESSION_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (res.ok) return;
  const body: unknown = await res.json().catch(() => ({}));
  throw new Error(rejectionMessage(body, res.status));
}

export async function postSession({ api, idToken }: PostSessionArgs): Promise<void> {
  if (api) {
    await api.post(SESSION_PATH, { idToken });
    return;
  }
  await postSessionViaFetch(idToken);
}
