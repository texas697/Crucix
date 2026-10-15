import { parseUrl } from '../../state/url';
import { channelIndexFor } from './channels';

export interface MediaRoute {
  channelIndex: number;
  isGridOn: boolean;
  settings: string;
}

export function routeFromUrl(href: string): MediaRoute | null {
  try {
    const { path, q } = parseUrl(href);
    return { channelIndex: channelIndexFor(path[1]), isGridOn: q.grid === '1', settings: q.settings ?? '' };
  } catch {
    return null;
  }
}

export function seedChannel(href: string): number {
  const idx = routeFromUrl(href)?.channelIndex ?? -1;
  return idx >= 0 ? idx : 0;
}

export function seedGrid(href: string): boolean {
  return routeFromUrl(href)?.isGridOn ?? false;
}
