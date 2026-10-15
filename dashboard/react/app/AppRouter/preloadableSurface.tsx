import { lazy, type ComponentType, type ReactElement } from 'react';

export interface PreloadableSurface<P extends object> {
  (props: P): ReactElement;
  preload: () => Promise<ComponentType<P>>;
}

export function createPreloadableSurface<P extends object>(load: () => Promise<ComponentType<P>>): PreloadableSurface<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const preload = () => {
    pending ??= load().then(
      (component) => {
        loaded = component;
        return component;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };
  const Lazy = lazy(() => preload().then((component) => ({ default: component })));
  function Surface(props: P) {
    const Loaded = loaded;
    return Loaded ? <Loaded {...props} /> : <Lazy {...props} />;
  }
  return Object.assign(Surface, { preload });
}
