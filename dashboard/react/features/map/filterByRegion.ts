import type { SweepData } from '../../api/types';
import { inRegionBox, textInRegion, type RegionKey } from './regions';

type LooseRow = Record<string, unknown>;

export function filterByRegion(data: SweepData, region: RegionKey): SweepData {
  if (region === 'world') return data;
  const out = { ...data };
  const news = data.news as LooseRow[] | undefined;
  if (Array.isArray(news)) {
    out.news = news.filter((n) => inRegionBox(Number(n.lat), Number(n.lon), region) || textInRegion(n.title, region));
  }
  const feed = data.newsFeed as LooseRow[] | undefined;
  if (Array.isArray(feed)) {
    out.newsFeed = feed.filter((n) => textInRegion(`${n.region ?? ''} ${n.headline ?? ''}`, region));
  }
  const disasters = data.disasters as { events?: LooseRow[] } | undefined;
  if (disasters?.events) {
    out.disasters = { ...disasters, events: disasters.events.filter((e) => inRegionBox(Number(e.lat), Number(e.lon), region)) };
  }
  const outages = data.outages as { countries?: LooseRow[] } | undefined;
  if (outages?.countries) {
    out.outages = { ...outages, countries: outages.countries.filter((c) => inRegionBox(Number(c.lat), Number(c.lon), region)) };
  }
  return out;
}
