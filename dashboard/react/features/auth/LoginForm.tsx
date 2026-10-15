import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { ApiClient } from '../../api/client';
import { hasGoogleRedirectMarker, type FirebaseAdapter, type FirebaseUserLike } from './firebaseAdapter';
import { safeNext } from './safeNext';

// The sign-in surface, ported from dashboard/auth/login.html. It is host-agnostic: it takes the
// Firebase adapter, the `/api/session` client (or falls back to `fetch`) and the raw `next` value as
// props, and never reads or writes host globals itself except to navigate on success.

type Mode = 'signin' | 'signup' | 'reset';

interface Msg {
  text: string;
  cls: '' | 'ok' | 'err';
}

export interface LoginFormProps {
  adapter: FirebaseAdapter;
  /** `?reason=expired` shows the session-expired notice. */
  reason?: string | null;
  /** Raw `?next=` value; validated through safeNext before it is used. */
  next: string;
  /** Called with the Firebase user once the server session is established. */
  onSession: (user: unknown) => void;
  /** Same-origin API client for `POST /api/session`; falls back to `fetch` when omitted. */
  api?: ApiClient;
  /** Navigation side effect; defaults to `window.location.replace`. Injectable for tests. */
  navigate?: (href: string) => void;
}

function errorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

/** Maps a Firebase error code to the legacy user-facing string (login.html `friendly()`). */
export function friendlyError(err: unknown): string {
  const code = errorCode(err);
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'Invalid email or password.';
  }
  if (code.includes('email-already-in-use')) return 'That email already has an account — sign in instead.';
  if (code.includes('weak-password')) return 'Password must be at least 8 characters.';
  if (code.includes('too-many-requests')) return 'Too many attempts — wait a minute and retry.';
  if (code.includes('operation-not-allowed')) return 'This sign-in method is not enabled in Firebase.';
  if (code.includes('unauthorized-domain')) return 'This domain is not authorized in Firebase Auth settings.';
  if (code.includes('account-exists-with-different-credential')) {
    return 'That email already uses a different sign-in method.';
  }
  return errorMessage(err) || 'Sign-in failed.';
}

async function postSessionViaFetch(idToken: string): Promise<void> {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (res.ok) return;
  const body: unknown = await res.json().catch(() => ({}));
  const message =
    body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `Server rejected session (${res.status})`;
  throw new Error(message);
}

function currentOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

// Ported state for the three modes. `signup` is only offered when the adapter allows it.
export function LoginForm({ adapter, reason, next, onSession, api, navigate }: LoginFormProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<null | 'form' | 'google'>(null);
  const [msg, setMsg] = useState<Msg>(() => {
    if (reason === 'expired') return { text: 'Session expired — please sign in again.', cls: 'err' };
    if (!adapter.ready) return { text: 'Server is missing FIREBASE_WEB_CONFIG — auth cannot start.', cls: 'err' };
    return { text: '', cls: '' };
  });
  const redirectHandled = useRef(false);

  const go = useCallback(
    (href: string) => {
      if (navigate) navigate(href);
      else if (typeof window !== 'undefined') window.location.replace(href);
    },
    [navigate],
  );

  // Hand the fresh ID token to the server, drop the temporary SDK session, then leave the page. The
  // token is never stored anywhere.
  const establish = useCallback(
    async (user: FirebaseUserLike) => {
      const idToken = await user.getIdToken(true);
      if (api) await api.post('/api/session', { idToken });
      else await postSessionViaFetch(idToken);
      await adapter.signOut().catch(() => { /* best effort */ });
      setMsg({ text: 'Access granted — loading terminal…', cls: 'ok' });
      onSession(user);
      go(safeNext(next, currentOrigin()));
    },
    [adapter, api, go, next, onSession],
  );

  // Complete a redirect-based Google sign-in on mount (mobile browsers that block popups).
  useEffect(() => {
    if (!adapter.ready || redirectHandled.current) return;
    const hasMarker = hasGoogleRedirectMarker();
    if (hasMarker) setMsg({ text: 'Finishing Google sign-in…', cls: '' });
    redirectHandled.current = true;
    adapter.completeGoogleRedirect()
      .then(async (cred) => {
        if (cred?.user) {
          setMsg({ text: 'Finishing Google sign-in…', cls: '' });
          await establish(cred.user);
        }
      })
      .catch((err: unknown) => setMsg({ text: friendlyError(err), cls: 'err' }));
  }, [adapter, establish]);

  const setModeAnd = (m: Mode) => {
    setMode(m);
    setMsg({ text: '', cls: '' });
  };

  async function handleReset(): Promise<void> {
    const emailValue = email.trim();
    if (!emailValue) {
      setMsg({ text: 'Enter your email first, then click Forgot password.', cls: 'err' });
      return;
    }
    setBusy('form');
    setMsg({ text: 'Sending reset email…', cls: '' });
    try {
      await adapter.resetPassword(emailValue);
      setMsg({ text: 'Password reset email sent.', cls: 'ok' });
    } catch (err) {
      setMsg({ text: friendlyError(err), cls: 'err' });
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    if (!adapter.ready || busy) return;
    if (mode === 'reset') {
      await handleReset();
      return;
    }
    setBusy('form');
    setMsg({ text: 'Authenticating…', cls: '' });
    try {
      const cred =
        mode === 'signup'
          ? await adapter.signUp(email.trim(), password)
          : await adapter.signIn(email.trim(), password);
      await establish(cred.user);
    } catch (err) {
      setMsg({ text: friendlyError(err), cls: 'err' });
      setBusy(null);
    }
  }

  async function handleGoogle(): Promise<void> {
    if (!adapter.ready || busy) return;
    setBusy('google');
    setMsg({
      text: 'Opening Google sign-in… (if nothing appears, allow popups or use the redirect link below)',
      cls: '',
    });
    try {
      const cred = await adapter.signInWithGoogle();
      if (cred?.user) await establish(cred.user);
      else setBusy(null);
    } catch (err) {
      setMsg({ text: friendlyError(err), cls: 'err' });
      setBusy(null);
    }
  }

  const submitting = busy === 'form';
  const googleBusy = busy === 'google';
  const disabled = !adapter.ready || busy !== null;
  const title = mode === 'signup' ? 'Create account' : 'Sign in';
  const submitLabel = mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in';

  return (
    <div className="crucix-login">
      <style>{LOGIN_CSS}</style>
      <div className="card">
        <h1>{title}</h1>
        <div className="sub">Access to this intelligence terminal requires an account.</div>

        <div className="tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'tab active' : 'tab'}
            onClick={() => setModeAnd('signin')}
          >
            Sign in
          </button>
          {adapter.allowSignup && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'tab active' : 'tab'}
              onClick={() => setModeAnd('signup')}
            >
              Create account
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'reset'}
            className={mode === 'reset' ? 'tab active' : 'tab'}
            onClick={() => setModeAnd('reset')}
          >
            Forgot password
          </button>
        </div>

        <button className="google" id="google" type="button" onClick={() => void handleGoogle()} disabled={disabled}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
            <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          {googleBusy ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <div className="or">or use email</div>

        <form id="form" autoComplete="on" onSubmit={(e) => void handleSubmit(e)}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy !== null}
          />
          {mode !== 'reset' && (
            <>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy !== null}
              />
            </>
          )}
          <button className="primary" id="submit" type="submit" disabled={disabled}>
            {submitting ? 'Authenticating…' : submitLabel}
          </button>
        </form>

        <div
          className={'msg ' + msg.cls}
          id="msg"
          role={msg.cls === 'err' ? 'alert' : undefined}
          aria-live={msg.cls === 'err' ? 'assertive' : 'polite'}
        >
          {msg.text}
        </div>

        <div className="foot">
          Your own LLM API key can be added after sign-in and is stored encrypted. Keys are only used to generate your
          trade ideas.
        </div>
      </div>
    </div>
  );
}

// Legacy palette/shape copied from dashboard/auth/login.html (lines 17-44), scoped to `.crucix-login`
// so it cannot leak into the other React surfaces that share the document.
const LOGIN_CSS = `
.crucix-login{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px 16px;
  background-image:radial-gradient(ellipse at 20% 10%,rgba(220,226,236,0.05),transparent 50%),radial-gradient(ellipse at 80% 90%,rgba(139,149,166,0.05),transparent 50%)}
.crucix-login .card{width:100%;max-width:400px;background:var(--panel);border:1px solid var(--border);padding:28px 26px;backdrop-filter:blur(10px)}
.crucix-login h1{font-size:22px;font-weight:600;text-align:center;margin:4px 0}
.crucix-login .sub{font-size:12px;color:var(--dim);line-height:1.5;margin-bottom:18px;text-align:center}
.crucix-login .tabs{display:flex;gap:6px;margin:0 0 16px}
.crucix-login .tab{flex:1;padding:8px;background:none;border:1px solid var(--border);color:var(--dim);cursor:pointer;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase}
.crucix-login .tab.active{border-color:var(--border-bright);color:var(--accent)}
.crucix-login label{display:block;font-family:var(--mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--dim);margin:12px 0 5px}
.crucix-login input{width:100%;background:rgba(255,255,255,0.03);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:13px;padding:10px 11px;outline:none}
.crucix-login input:focus{border-color:var(--border-bright)}
.crucix-login button{cursor:pointer;font-family:var(--mono);letter-spacing:0.1em;text-transform:uppercase;font-size:11px;font-weight:600}
.crucix-login .primary{width:100%;margin-top:18px;padding:12px;background:rgba(220,226,236,0.10);border:1px solid var(--border-bright);color:var(--accent)}
.crucix-login .primary:hover{background:rgba(220,226,236,0.18)}
.crucix-login .primary:disabled,.crucix-login .google:disabled{opacity:0.5;cursor:wait}
.crucix-login .google{width:100%;padding:11px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text);display:flex;align-items:center;justify-content:center;gap:10px}
.crucix-login .google:hover{border-color:var(--border-bright)}
.crucix-login .google svg{width:16px;height:16px}
.crucix-login .or{display:flex;align-items:center;gap:10px;margin:16px 0 2px;font-family:var(--mono);font-size:9px;letter-spacing:0.14em;color:var(--dim)}
.crucix-login .or::before,.crucix-login .or::after{content:'';flex:1;height:1px;background:var(--border)}
.crucix-login .msg{margin-top:14px;font-family:var(--mono);font-size:11px;line-height:1.5;min-height:16px}
.crucix-login .msg.err{color:var(--danger)}
.crucix-login .msg.ok{color:var(--accent)}
.crucix-login .foot{margin-top:22px;font-size:10px;color:var(--dim);line-height:1.5;border-top:1px solid var(--border);padding-top:12px}
`;
