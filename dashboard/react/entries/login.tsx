import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Box from '@mui/material/Box';
import { createApiClient } from '../api/client';
import { AppProviders } from '../app/AppProviders';
import { CLASSES } from '../app/classes';
import { createFirebaseAdapter, type FirebaseNamespaceLike } from '../features/auth/firebaseAdapter';
import { LoginForm } from '../features/auth/LoginForm';
import { safeNext } from '../features/auth/safeNext';

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
const next = safeNext(params.get('next') ?? '/', origin);

const adapter = createFirebaseAdapter(globals.firebase ?? null, {
  config: globals.__FIREBASE_CONFIG__,
  allowSignup: globals.__ALLOW_SIGNUP__ !== false,
});
const api = createApiClient();

const onNavigate = (href: string): void => {
  window.location.replace(href);
};

createRoot(container).render(
  <StrictMode>
    <AppProviders api={api} hasSession={false}>
      <Box className={CLASSES.loginRoot} data-surface="login">
        <LoginForm
          adapter={adapter}
          reason={reason}
          next={next}
          api={api}
          onSession={() => undefined}
          navigate={onNavigate}
        />
      </Box>
    </AppProviders>
  </StrictMode>,
);
