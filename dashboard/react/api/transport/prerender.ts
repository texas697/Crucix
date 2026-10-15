import type { DocumentWithPrerender } from './types';

export function startAfterPrerender(begin: () => void, stop: () => void): () => void {
  const doc = typeof document !== 'undefined' ? (document as DocumentWithPrerender) : undefined;
  if (!doc || doc.prerendering !== true) {
    begin();
    return stop;
  }
  const onPrerenderChange = (): void => {
    if (doc.prerendering !== false) return;
    doc.removeEventListener('prerenderingchange', onPrerenderChange);
    begin();
  };
  doc.addEventListener('prerenderingchange', onPrerenderChange);
  return () => doc.removeEventListener('prerenderingchange', onPrerenderChange);
}
