// Mobile auth endpoints — unit + route tests.
// Uses Node.js built-in test runner (node:test) — no Firebase project or credentials needed.
// globalThis.fetch is stubbed so Identity Toolkit is never contacted.

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import {
  authEndpointsAvailable,
  signInWithPassword,
  signUpWithPassword,
  refreshIdToken,
  sendPasswordReset,
  sendVerifyEmail,
  toAuthUser,
  mountMobileAuthRoutes,
} from '../lib/auth/identity.mjs';

const KEY = 'test-web-key';
const realFetch = globalThis.fetch;

// ─── Helpers ──────────────────────────────────────────────────────────────

const mockResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

// Keep real fetch for loopback so the route tests can act as their own HTTP client.
const stubUpstream = (responder) => (url, init) => (
  String(url).startsWith('http://127.0.0.1') ? realFetch(url, init) : Promise.resolve(responder(url, init))
);

function restore(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function withKey(key) {
  if (key) process.env.FIREBASE_WEB_API_KEY = key;
  else delete process.env.FIREBASE_WEB_API_KEY;
  delete process.env.FIREBASE_WEB_CONFIG; // ensure the fallback cannot supply a key
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await once(server, 'listening');
  try { return await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.close(); await once(server, 'close'); }
}

function routeApp() {
  const app = express();
  app.use(express.json());
  mountMobileAuthRoutes(app);
  return app;
}

let savedFetch;
let savedKey;
let savedConfig;

beforeEach(() => {
  savedFetch = globalThis.fetch;
  savedKey = process.env.FIREBASE_WEB_API_KEY;
  savedConfig = process.env.FIREBASE_WEB_CONFIG;
  delete process.env.FIREBASE_WEB_API_KEY;
  delete process.env.FIREBASE_WEB_CONFIG;
});

afterEach(() => {
  globalThis.fetch = savedFetch;
  restore('FIREBASE_WEB_API_KEY', savedKey);
  restore('FIREBASE_WEB_CONFIG', savedConfig);
});

// ─── Availability ─────────────────────────────────────────────────────────

describe('authEndpointsAvailable', () => {
  it('is false when no web API key is configured', () => {
    withKey(null);
    assert.equal(authEndpointsAvailable(), false);
  });

  it('is true when FIREBASE_WEB_API_KEY is set', () => {
    withKey(KEY);
    assert.equal(authEndpointsAvailable(), true);
  });
});

// ─── signInWithPassword ───────────────────────────────────────────────────

describe('signInWithPassword', () => {
  it('posts credentials and returns the Identity Toolkit payload', async () => {
    withKey(KEY);
    let seen;
    globalThis.fetch = (url, init) => { seen = { url, init }; return Promise.resolve(mockResponse(200, { idToken: 'id', refreshToken: 'ref' })); };

    const data = await signInWithPassword({ email: 'a@b.c', password: 'secret' });

    assert.deepEqual(data, { idToken: 'id', refreshToken: 'ref' });
    assert.match(seen.url, /accounts:signInWithPassword\?key=test-web-key/);
    assert.equal(seen.init.method, 'POST');
    assert.equal(seen.init.headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(seen.init.body), { email: 'a@b.c', password: 'secret', returnSecureToken: true });
  });
});

// ─── signUpWithPassword ───────────────────────────────────────────────────

describe('signUpWithPassword', () => {
  it('includes displayName only when provided', async () => {
    withKey(KEY);
    let body;
    globalThis.fetch = (url, init) => { body = JSON.parse(init.body); return Promise.resolve(mockResponse(200, {})); };

    await signUpWithPassword({ email: 'a@b.c', password: 'secret' });
    assert.deepEqual(body, { email: 'a@b.c', password: 'secret', returnSecureToken: true });

    await signUpWithPassword({ email: 'a@b.c', password: 'secret', displayName: 'Ada' });
    assert.deepEqual(body, { email: 'a@b.c', password: 'secret', returnSecureToken: true, displayName: 'Ada' });
  });
});

// ─── Error mapping ────────────────────────────────────────────────────────

describe('error mapping', () => {
  const cases = [
    ['EMAIL_EXISTS', 'email-already-in-use', 409],
    ['INVALID_LOGIN_CREDENTIALS', 'invalid-credential', 401],
    ['WEAK_PASSWORD', 'weak-password', 400],
    ['TOO_MANY_ATTEMPTS_TRY_LATER', 'too-many-requests', 429],
  ];

  for (const [upstream, code, status] of cases) {
    it(`maps ${upstream} to ${code} (${status})`, async () => {
      withKey(KEY);
      globalThis.fetch = () => Promise.resolve(mockResponse(400, { error: { message: `${upstream} : detail` } }));

      await assert.rejects(
        signInWithPassword({ email: 'a@b.c', password: 'x' }),
        (err) => { assert.equal(err.code, code); assert.equal(err.status, status); return true; },
      );
    });
  }

  it('maps an unknown upstream code to unknown with 400', async () => {
    withKey(KEY);
    globalThis.fetch = () => Promise.resolve(mockResponse(400, { error: { message: 'SOMETHING_NEW' } }));
    await assert.rejects(
      signInWithPassword({ email: 'a@b.c', password: 'x' }),
      (err) => { assert.equal(err.code, 'unknown'); assert.equal(err.status, 400); return true; },
    );
  });

  it('maps network failure to 502', async () => {
    withKey(KEY);
    globalThis.fetch = () => Promise.reject(new Error('ECONNREFUSED'));
    await assert.rejects(
      signInWithPassword({ email: 'a@b.c', password: 'x' }),
      (err) => { assert.equal(err.status, 502); return true; },
    );
  });

  it('throws 503 when no key is configured', async () => {
    withKey(null);
    await assert.rejects(
      signInWithPassword({ email: 'a@b.c', password: 'x' }),
      (err) => { assert.equal(err.status, 503); return true; },
    );
  });
});

// ─── refreshIdToken ───────────────────────────────────────────────────────

describe('refreshIdToken', () => {
  it('sends form-encoded body and maps snake_case to camelCase', async () => {
    withKey(KEY);
    let seen;
    globalThis.fetch = (url, init) => { seen = { url, init }; return Promise.resolve(mockResponse(200, { id_token: 'new-id', refresh_token: 'new-ref', user_id: 'u1' })); };

    const data = await refreshIdToken('old-ref');

    assert.deepEqual(data, { token: 'new-id', refreshToken: 'new-ref' });
    assert.match(seen.url, /securetoken\.googleapis\.com\/v1\/token\?key=test-web-key/);
    assert.equal(seen.init.headers['content-type'], 'application/x-www-form-urlencoded');
    assert.equal(seen.init.body, 'grant_type=refresh_token&refresh_token=old-ref');
  });
});

// ─── sendPasswordReset / sendVerifyEmail / toAuthUser ─────────────────────

describe('oob + user shape', () => {
  it('sendPasswordReset requests a PASSWORD_RESET oob code', async () => {
    withKey(KEY);
    let body;
    globalThis.fetch = (url, init) => { body = JSON.parse(init.body); return Promise.resolve(mockResponse(200, { email: 'a@b.c' })); };
    await sendPasswordReset('a@b.c');
    assert.deepEqual(body, { requestType: 'PASSWORD_RESET', email: 'a@b.c' });
  });

  it('sendVerifyEmail requests a VERIFY_EMAIL oob code', async () => {
    withKey(KEY);
    let body;
    globalThis.fetch = (url, init) => { body = JSON.parse(init.body); return Promise.resolve(mockResponse(200, { email: 'a@b.c' })); };
    await sendVerifyEmail('id-token');
    assert.deepEqual(body, { requestType: 'VERIFY_EMAIL', idToken: 'id-token' });
  });

  it('toAuthUser maps decoded claims', () => {
    assert.deepEqual(
      toAuthUser({ uid: 'u1', email: 'a@b.c', name: 'Ada', email_verified: true, firebase: { sign_in_provider: 'password' } }),
      { uid: 'u1', email: 'a@b.c', displayName: 'Ada', emailVerified: true, providerIds: ['password'] },
    );
    assert.deepEqual(
      toAuthUser({ uid: 'u2' }),
      { uid: 'u2', email: null, displayName: null, emailVerified: false, providerIds: [] },
    );
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────

describe('mountMobileAuthRoutes', () => {
  it('answers 503 on every route when no key is configured', async () => {
    withKey(null);
    await withServer(routeApp(), async (base) => {
      const res = await fetch(`${base}/api/auth/signin`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      });
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.error.code, 'unavailable');
      assert.equal(typeof body.error.message, 'string');
    });
  });

  it('rejects blank input with a 400 error envelope and no upstream call', async () => {
    withKey(KEY);
    let called = false;
    globalThis.fetch = stubUpstream(() => { called = true; return mockResponse(200, {}); });
    await withServer(routeApp(), async (base) => {
      const res = await fetch(`${base}/api/auth/signin`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: '' }),
      });
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: { code: 'invalid-email', message: 'Email is required' } });
    });
    assert.equal(called, false);
  });

  it('maps an upstream error into the {error:{code,message}} envelope', async () => {
    withKey(KEY);
    globalThis.fetch = stubUpstream(() => mockResponse(400, { error: { message: 'EMAIL_EXISTS' } }));
    await withServer(routeApp(), async (base) => {
      const res = await fetch(`${base}/api/auth/signin`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.c', password: 'secret' }),
      });
      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.error.code, 'email-already-in-use');
      assert.equal(typeof body.error.message, 'string');
    });
  });

  it('returns a success envelope from reset-password', async () => {
    withKey(KEY);
    let upstreamUrl;
    globalThis.fetch = stubUpstream((url) => { upstreamUrl = url; return mockResponse(200, { email: 'a@b.c' }); });
    await withServer(routeApp(), async (base) => {
      const res = await fetch(`${base}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.c' }),
      });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
    });
    assert.match(upstreamUrl, /accounts:sendOobCode/);
  });
});
