import { parseUrl } from '../../state/url';
import { FILTER_VALUES } from './consts';
import type { DigestFilter, DigestRoute } from './types';

export function isDigestFilter(value: string | undefined): value is DigestFilter {
  return value !== undefined && (FILTER_VALUES as readonly string[]).includes(value);
}

export function routeFromUrl(href: string): DigestRoute {
  const { path, q } = parseUrl(href);
  return {
    id: path[1] || q.open || '',
    filter: isDigestFilter(q.filter) ? q.filter : 'all',
    topic: q.topic || '',
    q: q.q || '',
  };
}

export function settingsParam(href: string): string {
  return parseUrl(href).q.settings ?? '';
}
