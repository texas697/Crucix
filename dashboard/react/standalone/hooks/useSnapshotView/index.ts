import { useMemo } from 'react';
import type { SweepData } from '../../../api/types';
import { readLocaleDict } from '../../../app/bootGlobals';
import type { TickerItem } from '../../../features/dashboard/types';
import type { RegionKey } from '../../../features/map/regions';
import { createTranslator } from '../../../shared/locale';
import { filterByRegion } from '../../../features/map/filterByRegion';
import { healthFromSnapshot } from '../../healthFromSnapshot';
import type { SnapshotView } from '../../types';

export interface UseSnapshotViewArgs {
  snapshot: SweepData | null;
  region: RegionKey;
}

function feedOf(data: SweepData | null): TickerItem[] {
  const feed = (data?.newsFeed as TickerItem[] | undefined) ?? (data?.news as TickerItem[] | undefined) ?? [];
  return Array.isArray(feed) ? feed : [];
}

export function useSnapshotView({ snapshot, region }: UseSnapshotViewArgs): SnapshotView {
  const t = useMemo(() => {
    const dict = readLocaleDict();
    return dict ? createTranslator(dict) : undefined;
  }, []);

  const tickerItems = useMemo(() => feedOf(snapshot), [snapshot]);
  const health = useMemo(() => healthFromSnapshot(snapshot), [snapshot]);
  const viewData = useMemo(() => (snapshot ? filterByRegion(snapshot, region) : null), [snapshot, region]);
  const tickerFeed = useMemo(() => feedOf(viewData), [viewData]);
  const meta = snapshot?.meta ?? null;

  return useMemo(() => ({ t, tickerItems, tickerFeed, meta, health, viewData }), [t, tickerItems, tickerFeed, meta, health, viewData]);
}
