// Mobile (SDK-free) auth endpoints. Crucix proxies Firebase Auth's Identity Toolkit REST API so
// an F-Droid/FOSS client that cannot ship the Firebase SDK can still obtain a Firebase ID token,
// which requireAuth() accepts as `Authorization: Bearer <token>`. Accounts are shared with the
// Play/App Store app, so no second token type is introduced.

import { parseWebConfig, auth, allowSignup, isEmailAllowed } from './firebase.mjs';

const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1';
const TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

// ─── Web API key ──────────────────────────────────────────────────────────
// Explicit FIREBASE_WEB_API_KEY wins, otherwise reuse the key inside FIREBASE_WEB_CONFIG.
function webApiKey() {
  return process.env.FIREBASE_WEB_API_KEY || parseWebConfig()?.apiKey || null;
}

export function authEndpointsAvailable() {
  return Boolean(webApiKey());
}

function requireKey() {
  const key = webApiKey();
  if (!key) throw Object.assign(new Error('Firebase Web API key is not configured'), { status: 503, code: 'unavailable' });
  return key;
}

// ─── Error mapping ────────────────────────────────────────────────────────
// Identity Toolkit returns 400 { error: { message: 'CODE' | 'CODE : detail' } }; clients read `code`.
const CODE_MAP = {
  EMAIL_EXISTS: 'email-already-in-use',
  INVALID_LOGIN_CREDENTIALS: 'invalid-credential',
  INVALID_PASSWORD: 'invalid-credential',
  INVALID_EMAIL: 'invalid-credential',
  EMAIL_NOT_FOUND: 'user-not-found',
  WEAK_PASSWORD: 'weak-password',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'too-many-requests',
  USER_DISABLED: 'user-disabled',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'requires-recent-login',
  MISSING_EMAIL: 'invalid-email',
};

const STATUS_MAP = {
  'email-already-in-use': 409,
  'too-many-requests': 429,
  'invalid-credential': 401,
  'user-not-found': 401,
  'wrong-password': 401,
};

const MESSAGES = {
  'email-already-in-use': 'An account already exists for that email',
  'invalid-credential': 'Incorrect email or password',
  'user-not-found': 'No account found for that email',
  'weak-password': 'Password is too weak',
  'too-many-requests': 'Too many attempts, try again later',
  'user-disabled': 'This account has been disabled',
  'requires-recent-login': 'Please sign in again to continue',
  'invalid-email': 'That email address is not valid',
  unknown: 'Authentication failed',
};

function authError(rawMessage) {
  const upstream = String(rawMessage || '').split(':')[0].trim();
  const code = CODE_MAP[upstream] || 'unknown';
  const status = STATUS_MAP[code] || 400;
  return Object.assign(new Error(MESSAGES[code] || MESSAGES.unknown), { code, status });
}

// ─── Identity Toolkit calls ───────────────────────────────────────────────
// Read globalThis.fetch at call time so tests can stub it.
async function identityRequest(url, init) {
  let res;
  try {
    res = await globalThis.fetch(url, init);
  } catch (err) {
    throw Object.assign(new Error(`Auth provider unreachable: ${err.message}`), { status: 502 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) throw Object.assign(new Error('Auth provider unavailable'), { status: 502 });
    throw authError(data?.error?.message);
  }
  return data;
}

const postJson = (url, body) => identityRequest(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export async function signUpWithPassword({ email, password, displayName }) {
  const body = { email, password, returnSecureToken: true };
  if (displayName) body.displayName = displayName;
  return postJson(`${IDENTITY_BASE}/accounts:signUp?key=${requireKey()}`, body);
}

export async function signInWithPassword({ email, password }) {
  return postJson(`${IDENTITY_BASE}/accounts:signInWithPassword?key=${requireKey()}`, {
    email, password, returnSecureToken: true,
  });
}

export async function refreshIdToken(refreshToken) {
  const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const data = await identityRequest(`${TOKEN_URL}?key=${requireKey()}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  return { token: data.id_token, refreshToken: data.refresh_token };
}

export async function sendPasswordReset(email) {
  return postJson(`${IDENTITY_BASE}/accounts:sendOobCode?key=${requireKey()}`, { requestType: 'PASSWORD_RESET', email });
}

export async function sendVerifyEmail(idToken) {
  return postJson(`${IDENTITY_BASE}/accounts:sendOobCode?key=${requireKey()}`, { requestType: 'VERIFY_EMAIL', idToken });
}

/** Shape a decoded Firebase ID token into the FOSS client's user payload. */
export function toAuthUser(decoded) {
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    displayName: decoded.name ?? null,
    emailVerified: !!decoded.email_verified,
    providerIds: [decoded.firebase?.sign_in_provider].filter(Boolean),
  };
}

// ─── Express routes (public; mounted before the auth gate) ────────────────
const isBlank = (v) => typeof v !== 'string' || !v.trim();
const badRequest = (res, code, message) => res.status(400).json({ error: { code, message } });
const bearerToken = (req) => String(req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i)?.[1] || null;

function respondError(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error('[Auth] mobile endpoint error:', err.message);
  res.status(status).json({ error: { code: err.code || 'unknown', message: err.message } });
}

async function signin(req, res) {
  const { email, password } = req.body || {};
  if (isBlank(email)) return badRequest(res, 'invalid-email', 'Email is required');
  if (isBlank(password)) return badRequest(res, 'weak-password', 'Password is required');
  const data = await signInWithPassword({ email: email.trim(), password });
  const decoded = await auth().verifyIdToken(data.idToken, false);
  res.json({ token: data.idToken, refreshToken: data.refreshToken, user: toAuthUser(decoded) });
}

async function signup(req, res) {
  const { email, password, displayName } = req.body || {};
  if (isBlank(email)) return badRequest(res, 'invalid-email', 'Email is required');
  if (isBlank(password)) return badRequest(res, 'weak-password', 'Password is required');
  if (!allowSignup) return res.status(403).json({ error: { code: 'signup-disabled', message: 'Sign-up is disabled' } });
  if (!isEmailAllowed(email)) {
    return res.status(403).json({ error: { code: 'not-allowed', message: 'This email is not on the allow list' } });
  }
  const data = await signUpWithPassword({ email: email.trim(), password, displayName: displayName || undefined });
  const decoded = await auth().verifyIdToken(data.idToken, false);
  res.json({ token: data.idToken, refreshToken: data.refreshToken, user: toAuthUser(decoded) });
}

async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  if (isBlank(refreshToken)) return badRequest(res, 'invalid-credential', 'refreshToken is required');
  const data = await refreshIdToken(refreshToken);
  res.json({ token: data.token, refreshToken: data.refreshToken });
}

async function resetPassword(req, res) {
  const { email } = req.body || {};
  if (isBlank(email)) return badRequest(res, 'invalid-email', 'Email is required');
  await sendPasswordReset(email.trim());
  res.json({ ok: true });
}

async function verifyEmail(req, res) {
  const idToken = bearerToken(req);
  if (!idToken) return badRequest(res, 'invalid-credential', 'Bearer ID token required');
  await sendVerifyEmail(idToken);
  res.json({ ok: true });
}

/**
 * Register the public mobile auth endpoints. Mount before the auth gate — these routes are the
 * only way a Firebase-SDK-free client can obtain the ID token the gate later verifies.
 */
export function mountMobileAuthRoutes(app) {
  const guard = (handler) => async (req, res) => {
    if (!authEndpointsAvailable()) {
      return res.status(503).json({ error: { code: 'unavailable', message: 'Auth endpoints are not configured' } });
    }
    try { await handler(req, res); }
    catch (err) { respondError(res, err); }
  };
  app.post('/api/auth/signin', guard(signin));
  app.post('/api/auth/signup', guard(signup));
  app.post('/api/auth/refresh', guard(refresh));
  app.post('/api/auth/reset-password', guard(resetPassword));
  app.post('/api/auth/verify-email', guard(verifyEmail));
}
