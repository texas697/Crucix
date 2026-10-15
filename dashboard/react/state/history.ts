import { buildUrl } from './url';

export type HistoryKind =
  | 'region' | 'shape' | 'pin' | 'info' | 'guide' | 'settings' | 'read'
  | 'list' | 'channel';

export interface HistoryEntryState { k?: HistoryKind }

export interface SetOptions {
  isPush?: boolean;
  state?: HistoryEntryState | null;
}

export interface HistoryLike {
  state: unknown;
  length: number;
  pushState(state: unknown, title: string, url: string): void;
  replaceState(state: unknown, title: string, url: string): void;
  back(): void;
}
export interface LocationLike { href: string; pathname: string; search: string }

export type AfterCloseAction = 'back' | 'rewrite';

export interface HistoryAdapter {
  set(path: string | string[], q: Record<string, unknown>, opts?: SetOptions): boolean;
  afterClose(kind: HistoryKind): AfterCloseAction;
  here(): string;
}

export function createHistoryAdapter(
  history: HistoryLike,
  location: LocationLike,
): HistoryAdapter {
  const current = () => location.pathname + location.search;

  function set(path: string | string[], q: Record<string, unknown>, opts: SetOptions = {}): boolean {
    const { isPush = false, state = null } = opts;
    const url = buildUrl(path, q);
    if (url === current()) {
      if (state && isPush) history.replaceState(state, '', url);
      return false;
    }
    if (isPush) history.pushState(state ?? {}, '', url);
    else history.replaceState(state ?? history.state ?? {}, '', url);
    return true;
  }

  function afterClose(kind: HistoryKind): AfterCloseAction {
    const state = history.state as HistoryEntryState | null;
    if (state && state.k === kind && history.length > 1) {
      history.back();
      return 'back';
    }
    return 'rewrite';
  }

  function here(): string {
    return current();
  }

  return { set, afterClose, here };
}
