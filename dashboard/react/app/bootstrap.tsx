import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import type { Surface } from './surfaces';
import '../styles/placeholder.css';

// Mounts a surface. Transports, timers and paid/auth-sensitive fetches are NOT started here yet;
// when they land they must wait for `document.prerendering === false` and resume on
// `prerenderingchange`, because speculation-rules prerendering runs page scripts while invisible.
export function mount(surface: Surface): void {
  const container = document.getElementById('root');
  if (!container) throw new Error(`[crucix] missing #root for the ${surface} surface`);
  const root: Root = createRoot(container);
  root.render(
    <StrictMode>
      <App surface={surface} />
    </StrictMode>,
  );
}
