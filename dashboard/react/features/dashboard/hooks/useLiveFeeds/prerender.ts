interface DocumentWithPrerender extends Document {
  prerendering?: boolean;
}

export function startWhenVisible(start: () => void): () => void {
  const doc = typeof document !== 'undefined' ? (document as DocumentWithPrerender) : undefined;
  if (!doc || doc.prerendering !== true) {
    start();
    return () => undefined;
  }
  let remove: (() => void) | undefined;
  const onChange = (): void => {
    if (doc.prerendering === false) {
      remove?.();
      remove = undefined;
      start();
    }
  };
  doc.addEventListener('prerenderingchange', onChange);
  remove = () => doc.removeEventListener('prerenderingchange', onChange);
  return () => remove?.();
}
