import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSurfaceRoute } from '../../../../app/AppRouter/hooks/useSurfaceRoute';
import { SEARCH_DEBOUNCE_MS } from '../../consts';
import { routeFromUrl, settingsParam } from '../../route';
import type { DigestFilter, DigestLoader, DigestRoute, DigestViewActions, DigestViewState } from '../../types';

export interface UseDigestViewArgs {
  onLoad: DigestLoader;
}

function viewFromRoute(r: DigestRoute): DigestViewState {
  return { filter: r.filter, topic: r.topic, q: r.q, openArticleId: r.id || null };
}

export function useDigestView({ onLoad }: UseDigestViewArgs): DigestViewActions {
  const { location, history } = useSurfaceRoute();
  const seedRef = useRef<DigestViewState | null>(null);
  if (seedRef.current === null) seedRef.current = viewFromRoute(routeFromUrl(location.href));
  const [view, setView] = useState<DigestViewState>(seedRef.current);
  const [searchValue, setSearchValue] = useState(seedRef.current.q);
  const viewRef = useRef<DigestViewState>(view);
  const hrefRef = useRef(location.href);
  const isApplyingRouteRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasBootedRef = useRef(false);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { hrefRef.current = location.href; }, [location.href]);

  const syncUrl = useCallback((isPush: boolean, next: DigestViewState) => {
    if (isApplyingRouteRef.current) return;
    history.set(
      ['digest', next.openArticleId || ''],
      { filter: next.filter !== 'all' ? next.filter : '', topic: next.topic, q: next.q, settings: settingsParam(hrefRef.current) },
      { isPush, state: { k: next.openArticleId ? 'read' : 'list' } },
    );
  }, [history]);

  const commit = useCallback((next: DigestViewState, isPush: boolean) => {
    viewRef.current = next;
    setView(next);
    syncUrl(isPush, next);
    void onLoad(next.filter, next.topic, next.q);
  }, [syncUrl, onLoad]);

  const applyRoute = useCallback((href: string, isInitial: boolean) => {
    const r = routeFromUrl(href);
    isApplyingRouteRef.current = true;
    try {
      const cur = viewRef.current;
      const isListChanged = r.filter !== cur.filter || r.topic !== cur.topic || r.q !== cur.q;
      const next = viewFromRoute(r);
      viewRef.current = next;
      setView(next);
      setSearchValue(r.q);
      if (isListChanged || isInitial) void onLoad(r.filter, r.topic, r.q);
    } finally {
      isApplyingRouteRef.current = false;
    }
    if (isInitial) syncUrl(false, viewRef.current);
  }, [onLoad, syncUrl]);

  useEffect(() => {
    const isInitial = !hasBootedRef.current;
    hasBootedRef.current = true;
    applyRoute(location.href, isInitial);
  }, [applyRoute, location.href]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const onChooseFilter = useCallback((filter: DigestFilter) => commit({ ...viewRef.current, filter }, true), [commit]);
  const onSetTopic = useCallback((topic: string) => commit({ ...viewRef.current, topic, openArticleId: null }, true), [commit]);
  const onToggleTopic = useCallback((topic: string) => onSetTopic(viewRef.current.topic === topic ? '' : topic), [onSetTopic]);

  const onSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit({ ...viewRef.current, q: value.trim() }, false), SEARCH_DEBOUNCE_MS);
  }, [commit]);

  const onOpenArticle = useCallback((id: string) => {
    const next: DigestViewState = { ...viewRef.current, openArticleId: id };
    viewRef.current = next;
    setView(next);
    syncUrl(true, next);
  }, [syncUrl]);

  const onCloseReader = useCallback(() => {
    if (!viewRef.current.openArticleId) return;
    const outcome = history.afterClose('read');
    const next: DigestViewState = { ...viewRef.current, openArticleId: null };
    viewRef.current = next;
    setView(next);
    if (outcome === 'rewrite') syncUrl(false, next);
  }, [history, syncUrl]);

  const onResolved = useCallback((id: string) => {
    const next: DigestViewState = { ...viewRef.current, openArticleId: id };
    viewRef.current = next;
    setView(next);
    syncUrl(false, next);
  }, [syncUrl]);

  return useMemo(() => ({
    view, searchValue, onChooseFilter, onSetTopic, onToggleTopic, onSearchChange, onOpenArticle, onCloseReader, onResolved,
  }), [view, searchValue, onChooseFilter, onSetTopic, onToggleTopic, onSearchChange, onOpenArticle, onCloseReader, onResolved]);
}
