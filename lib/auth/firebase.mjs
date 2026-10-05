// Firebase Auth gate — every dashboard/API route requires a signed-in user.
//
// Flow: browser signs in with the Firebase Web SDK (login.html) → POSTs the ID token to
// /api/session → server mints a long-lived httpOnly session cookie → every later request
// (HTML, /api/*, SSE) is verified with firebase-admin. No tokens ever live in localStorage.

import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const COOKIE_NAME = 'crucix_session';
const SESSION_DAYS = parseInt(process.env.AUTH_SESSION_DAYS) || 14;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

let app = null;

export function parseWebConfig() {
  const raw = process.env.FIREBASE_WEB_CONFIG;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { throw new Error('FIREBASE_WEB_CONFIG is not valid JSON'); }
}

export function initFirebase() {
  if (app) return app;
  const web = parseWebConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || web?.projectId || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error('Set FIREBASE_WEB_CONFIG (JSON from `firebase apps:sdkconfig web`) or FIREBASE_PROJECT_ID');

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else {
    credential = applicationDefault(); // Cloud Run service account, or GOOGLE_APPLICATION_CREDENTIALS locally
  }
  app = getApps()[0] || initializeApp({ credential, projectId });
  return app;
}

export const auth = () => getAuth(initFirebase());
export const db = () => getFirestore(initFirebase());

// ─── Access policy ─────────────────────────────────────────────────────────
const allowedEmails = (process.env.AUTH_ALLOWED_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const allowedDomains = (process.env.AUTH_ALLOWED_DOMAINS || '')
  .split(',').map(s => s.trim().toLowerCase().replace(/^@/, '')).filter(Boolean);

export const allowSignup = (process.env.AUTH_ALLOW_SIGNUP || 'true').toLowerCase() !== 'false';

export function isEmailAllowed(email) {
  if (!allowedEmails.length && !allowedDomains.length) return true;
  const e = String(email || '').toLowerCase();
  if (allowedEmails.includes(e)) return true;
  const domain = e.split('@')[1] || '';
  return allowedDomains.includes(domain);
}

// ─── Cookie helpers (no cookie-parser dependency) ─────────────────────────
export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function isSecure(req) {
  return req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
}

export function setSessionCookie(req, res, value, maxAgeMs = SESSION_MS) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/', 'HttpOnly', 'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (isSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req, res) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ─── Session lifecycle ─────────────────────────────────────────────────────
export async function createSession(idToken) {
  const decoded = await auth().verifyIdToken(idToken, true);
  if (!decoded.email) throw Object.assign(new Error('Account has no email'), { status: 400 });
  if (!isEmailAllowed(decoded.email)) {
    throw Object.assign(new Error('This email is not on the allow list'), { status: 403 });
  }
  const cookie = await auth().createSessionCookie(idToken, { expiresIn: SESSION_MS });
  return { cookie, user: { uid: decoded.uid, email: decoded.email, name: decoded.name || null } };
}

export async function verifySession(cookieValue) {
  const decoded = await auth().verifySessionCookie(cookieValue, false);
  return { uid: decoded.uid, email: decoded.email || null, name: decoded.name || null };
}

export async function revokeSessions(uid) {
  await auth().revokeRefreshTokens(uid);
}

/**
 * Express middleware. HTML navigations bounce to /login; API + SSE get 401 JSON.
 */
export function requireAuth() {
  return async (req, res, next) => {
    const cookie = readCookie(req, COOKIE_NAME);
    const wantsHtml = req.method === 'GET' && !req.path.startsWith('/api/') && req.path !== '/events'
      && String(req.headers.accept || '').includes('text/html');
    const deny = () => {
      clearSessionCookie(req, res);
      if (wantsHtml) {
        const next = encodeURIComponent(req.originalUrl || '/');
        return res.redirect(302, `/login?next=${next}`);
      }
      return res.status(401).json({ error: 'Authentication required', login: '/login' });
    };
    if (!cookie) return deny();
    try {
      const user = await verifySession(cookie);
      if (!isEmailAllowed(user.email)) return deny();
      req.user = user;
      return next();
    } catch {
      return deny();
    }
  };
}
