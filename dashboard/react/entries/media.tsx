import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHistoryAdapter } from '../state/history';
import { PageShell } from '../app/PageShell';
import { MediaApp } from '../features/media/MediaApp';

// React entry for the Live media surface. Unlike the P1 placeholder it mounts the real player and
// wires the history adapter over window.history (so channel/grid changes and Back/Forward restore
// from the URL). The media page performs no same-origin fetches and injects no host globals.
const container = document.getElementById('root');
if (!container) throw new Error('[crucix] missing #root for the media surface');

createRoot(container).render(
  <StrictMode>
    <PageShell surface="media">
      <MediaApp
        history={createHistoryAdapter(window.history, window.location)}
        location={{
          href: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
        }}
      />
    </PageShell>
  </StrictMode>,
);
