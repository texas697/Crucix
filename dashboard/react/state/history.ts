import { buildUrl } from './url';

// History ownership for in-page filters and dialogs. Ports the legacy UrlState.set / urlAfterClose
// rules: opening a dialog pushes an entry the Back button can undo; adjusting a filter replaces in
// place; closing only calls Back when the current entry was opened by that dialog.

export type HistoryKind =
  | 'region' | 'shape' | 'pin' | 'info' | 'guide' | 'settings' | 'read'
  | 'list' | 'channel';

export interface HistoryEntryState { k?: HistoryKind }

export interface SetOptions {
  push?: boolean;
  state?: HistoryEntryState | null;
}

/** Minimal shapes so tests can inject fakes. */
export interface HistoryLike {
  state: unknown;
  length: number;
  pushState(state: unknown, title: string, url: string): void;
  replaceState(state: unknown, title: string, url: string): void;
  back(): void;
}
export interface LocationLike { href: string; pathname: string; search: string }

export interface HistoryAdapter {
  /** Returns true when the URL changed. */
  set(path: string | string[], q: Record<string, unknown>, opts?: SetOptions): boolean;
  /** 'back' when the current entry is owned by `kind` (Back was invoked); 'rewrite' otherwise. */
  afterClose(kind: HistoryKind): 'back' | 'rewrite';
  /** The full current location, for the login `next` round-trip. */
  here(): string;
}

export function createHistoryAdapter(
  history: HistoryLike,
  location: LocationLike,
): HistoryAdapter {
  const current = () => location.pathname + location.search;

  function set(path: string | string[], q: Record<string, unknown>, opts: SetOptions = {}): boolean {
    const { push = false, state = null } = opts;
    const url = buildUrl(path, q);
    if (url === current()) {
      if (state && push) history.replaceState(state, '', url);
      return false;
    }
    if (push) history.pushState(state ?? {}, '', url);
    else history.replaceState(state ?? history.state ?? {}, '', url);
    return true;
  }

  function afterClose(kind: HistoryKind): 'back' | 'rewrite' {
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
