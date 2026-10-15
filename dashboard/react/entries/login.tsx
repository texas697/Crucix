import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createApiClient } from '../api/client';
import { PageShell } from '../app/PageShell';
import {
  createFirebaseAdapter,
  type FirebaseNamespaceLike,
} from '../features/auth/firebaseAdapter';
import { LoginForm } from '../features/auth/LoginForm';
import { safeNext } from '../features/auth/safeNext';

// React entry for the sign-in surface. The document loads the Firebase compat SDK from gstatic and
// injects `window.__FIREBASE_CONFIG__` / `window.__ALLOW_SIGNUP__` (see server.mjs GET /login), so we
// read those globals here and hand them to the adapter rather than importing the SDK. Everything is
// read defensively: when the globals are missing the form mounts in its disabled state.

interface LoginGlobals {
  firebase?: FirebaseNamespaceLike | null;
  __FIREBASE_CONFIG__?: unknown;
  __ALLOW_SIGNUP__?: boolean;
}

const container = document.getElementById('root');
if (!container) throw new Error('[crucix] missing #root for the login surface');

const globals = window as unknown as LoginGlobals;
const params = new URLSearchParams(window.location.search);
const origin = window.location.origin;
const reason = params.get('reason');

// Validate `next` up front so the value handed to the form can never be an off-origin redirect.
const next = safeNext(params.get('next') ?? '/', origin);

const adapter = createFirebaseAdapter(globals.firebase ?? null, {
  config: globals.__FIREBASE_CONFIG__,
  allowSignup: globals.__ALLOW_SIGNUP__ !== false,
});
const api = createApiClient();

createRoot(container).render(
  <StrictMode>
    <PageShell surface="login">
      <LoginForm
        adapter={adapter}
        reason={reason}
        next={next}
        api={api}
        // Navigation is owned by the form (to safeNext); this hook exists for any post-session work.
        onSession={() => { /* session cookie is set by /api/session; the form redirects */ }}
        navigate={(href) => { window.location.replace(href); }}
      />
    </PageShell>
  </StrictMode>,
);
