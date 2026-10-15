import type { DigestFilter, DigestFilterOption } from './types';

export const FILTER_VALUES: readonly DigestFilter[] = ['all', 'foryou', 'thinktank', 'news'];

export const FILTER_LABELS: ReadonlyArray<DigestFilterOption> = [
  { value: 'all', label: 'All' },
  { value: 'foryou', label: 'For you' },
  { value: 'thinktank', label: 'Think tanks' },
  { value: 'news', label: 'News' },
];

export const SEARCH_DEBOUNCE_MS = 250;
