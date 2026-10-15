export const GOOGLE_REDIRECT_KEY = 'crucix_google_redirect';

export const NOT_READY_MESSAGE = 'Server is missing FIREBASE_WEB_CONFIG — auth cannot start.';

export const GOOGLE_PROVIDER_PARAMS = { prompt: 'select_account' };

export const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

export const POPUP_DISMISS_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
]);
