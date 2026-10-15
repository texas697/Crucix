import { useMemo } from 'react';
import type { SweepData } from '../../../../api/types';
import { readLocaleDict } from '../../../../app/bootGlobals';
import { filterByRegion } from '../../../map/filterByRegion';
import type { RegionKey } from '../../../map/regions';
import { createTranslator, type Translator } from '../../../../shared/locale';
import type { TickerItem } from '../../types';

export interface UseDashboardViewArgs {
  data: SweepData | null;
  region: RegionKey;
}

export interface DashboardView {
  t?: Translator;
  tickerItems: TickerItem[];
  tickerFeed: TickerItem[];
  viewData: SweepData | null;
}

function feedOf(data: SweepData | null): TickerItem[] {
  const feed = (data?.newsFeed as TickerItem[] | undefined) ?? (data?.news as TickerItem[] | undefined) ?? [];
  return Array.isArray(feed) ? feed : [];
}

export function useDashboardView({ data, region }: UseDashboardViewArgs): DashboardView {
  const t = useMemo(() => {
    const dict = readLocaleDict();
    return dict ? createTranslator(dict) : undefined;
  }, []);

  const tickerItems = useMemo(() => feedOf(data), [data]);
  const viewData = useMemo(() => (data ? filterByRegion(data, region) : null), [data, region]);
  const tickerFeed = useMemo(() => feedOf(viewData), [viewData]);

  return useMemo(() => ({ t, tickerItems, tickerFeed, viewData }), [t, tickerItems, tickerFeed, viewData]);
}
