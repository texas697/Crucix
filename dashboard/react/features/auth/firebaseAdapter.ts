// Thin, typed wrapper over the Firebase compat SDK that the login page loads as globals
// (`window.firebase`, plus `window.__FIREBASE_CONFIG__` / `window.__ALLOW_SIGNUP__` injected by the
// server). This module deliberately does NOT import the SDK: it is served by gstatic and read off
// `window`, so the component still renders (in a clear disabled state) when the globals are absent
// — which is exactly what happens in tests and when the server is misconfigured.
//
// It ports the auth plumbing from dashboard/auth/login.html: `initializeApp(CFG)`, the three email
// flows, the Google popup-with-redirect-fallback (with the `crucix_google_redirect` sessionStorage
// marker), and the temporary session sign-out after the server exchange. No `any` leaks into the
// public surface.

/** Minimal shape of a Firebase compat user. Only what the login flow touches. */
export interface FirebaseUserLike {
  uid?: string;
  email?: string | null;
  /** `forceRefresh=true` mints a fresh token for the server exchange, as the legacy did. */
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

/** Result of a Firebase credential-returning call (`{ user }`). */
export interface FirebaseCredentialLike {
  user: FirebaseUserLike;
}

/** The compat Google provider. */
export interface GoogleAuthProviderLike {
  setCustomParameters(params: Record<string, string>): void;
}

/** Minimal shape of a Firebase compat auth instance. */
export interface FirebaseAuthLike {
  currentUser: FirebaseUserLike | null;
  signInWithEmailAndPassword(email: string, password: string): Promise<FirebaseCredentialLike>;
  createUserWithEmailAndPassword(email: string, password: string): Promise<FirebaseCredentialLike>;
  sendPasswordResetEmail(email: string): Promise<void>;
  signInWithPopup(provider: unknown): Promise<FirebaseCredentialLike>;
  signInWithRedirect(provider: unknown): Promise<void>;
  getRedirectResult(): Promise<FirebaseCredentialLike | null>;
  signOut(): Promise<void>;
}

/**
 * The compat `firebase.auth` namespace is callable *and* carries constructors such as
 * `GoogleAuthProvider`, so it needs a call signature plus properties.
 */
export interface FirebaseAuthFactory {
  (): FirebaseAuthLike;
  GoogleAuthProvider: new () => GoogleAuthProviderLike;
}

/** Minimal shape of the compat `window.firebase` namespace (app + auth). */
export interface FirebaseNamespaceLike {
  initializeApp(config: unknown): unknown;
  auth: FirebaseAuthFactory;
}

/** Error values coming out of the SDK (only `code`/`message` are used). */
interface FirebaseErrorLike {
  code?: unknown;
  message?: unknown;
}

/** The typed surface the login form consumes. */
export interface FirebaseAdapter {
  /** False when the SDK script or `__FIREBASE_CONFIG__` is missing; the form renders disabled. */
  readonly ready: boolean;
  /** Whether the deployment offers sign-up (mirrors `window.__ALLOW_SIGNUP__ !== false`). */
  readonly allowSignup: boolean;
  signIn(email: string, password: string): Promise<FirebaseCredentialLike>;
  signUp(email: string, password: string): Promise<FirebaseCredentialLike>;
  resetPassword(email: string): Promise<void>;
  /**
   * Tries the popup flow and falls back to a full-page redirect on the legacy popup-blocked codes.
   * Resolves with the credential on popup success, or `null` when a redirect was started or the
   * popup was dismissed/cancelled (both are non-errors).
   */
  signInWithGoogle(): Promise<FirebaseCredentialLike | null>;
  /** Completes a redirect-based sign-in. Resolves with the credential, or `null` when there was none. */
  completeGoogleRedirect(): Promise<FirebaseCredentialLike | null>;
  /** Freshest ID token for the current SDK user, or `null` when signed out. Never persisted. */
  currentIdToken(): Promise<string | null>;
  signOut(): Promise<void>;
}

/** Optional overrides; all default to the host globals. */
export interface FirebaseAdapterOptions {
  /** Web config; defaults to `window.__FIREBASE_CONFIG__`. */
  config?: unknown;
  /** Whether sign-up is offered; defaults to `window.__ALLOW_SIGNUP__ !== false`. */
  allowSignup?: boolean;
}

/** sessionStorage marker set before a Google redirect and cleared after getRedirectResult(). */
export const GOOGLE_REDIRECT_KEY = 'crucix_google_redirect';

/** Popup failure codes the legacy turns into a redirect. */
const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

/** Popup failure codes the legacy treats as a silent dismissal. */
const POPUP_DISMISS_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
]);

/** Host globals injected by the login document. */
interface CrucixAuthGlobals {
  firebase?: FirebaseNamespaceLike | null;
  __FIREBASE_CONFIG__?: unknown;
  __ALLOW_SIGNUP__?: boolean;
}

function readGlobals(): CrucixAuthGlobals {
  if (typeof window === 'undefined') return {};
  return window as unknown as CrucixAuthGlobals;
}

function errorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as FirebaseErrorLike).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function notReadyError(): Error {
  return new Error('Server is missing FIREBASE_WEB_CONFIG — auth cannot start.');
}

function readMarker(): string | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(GOOGLE_REDIRECT_KEY) : null;
  } catch {
    return null;
  }
}

function writeMarker(): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(GOOGLE_REDIRECT_KEY, '1');
  } catch {
    /* storage unavailable (private mode); the redirect still works */
  }
}

function clearMarker(): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
  } catch {
    /* ignore */
  }
}

/** True when a Google redirect is mid-flight (used to show the "Finishing…" state). */
export function hasGoogleRedirectMarker(): boolean {
  return readMarker() !== null;
}

/**
 * Builds the adapter over the compat SDK. Pass `firebase` explicitly (tests, or a host that already
 * holds the namespace) or let it read `window.firebase`.
 */
export function createFirebaseAdapter(
  firebase?: FirebaseNamespaceLike | null,
  options: FirebaseAdapterOptions = {},
): FirebaseAdapter {
  const globals = readGlobals();
  const fb = firebase ?? globals.firebase ?? null;
  const config = options.config ?? globals.__FIREBASE_CONFIG__;
  const allowSignup = options.allowSignup ?? globals.__ALLOW_SIGNUP__ !== false;

  // Legacy only programs the SDK when a config is present; a missing config is the disabled state.
  const configured = fb !== null && config !== undefined && config !== null;
  if (configured && fb) {
    try {
      fb.initializeApp(config);
    } catch {
      // "app/duplicate-app" from a prior initializeApp — harmless, the auth instance is still usable.
    }
  }
  const ready = Boolean(configured);

  function requireFb(): FirebaseNamespaceLike {
    if (!fb || !ready) throw notReadyError();
    return fb;
  }

  function auth(): FirebaseAuthLike {
    return requireFb().auth();
  }

  function googleProvider(): GoogleAuthProviderLike {
    const GoogleAuthProvider = requireFb().auth.GoogleAuthProvider;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  }

  async function googleRedirect(): Promise<null> {
    writeMarker();
    await auth().signInWithRedirect(googleProvider());
    return null;
  }

  return {
    ready,
    allowSignup,
    signIn: (email, password) => auth().signInWithEmailAndPassword(email, password),
    signUp: (email, password) => auth().createUserWithEmailAndPassword(email, password),
    resetPassword: (email) => auth().sendPasswordResetEmail(email),
    async signInWithGoogle() {
      try {
        return await auth().signInWithPopup(googleProvider());
      } catch (err) {
        const code = errorCode(err);
        if (POPUP_FALLBACK_CODES.has(code)) return googleRedirect();
        if (POPUP_DISMISS_CODES.has(code)) return null;
        throw err;
      }
    },
    async completeGoogleRedirect() {
      // Matches the legacy: clear the marker as soon as the result is read, regardless of outcome.
      clearMarker();
      const result = await auth().getRedirectResult();
      return result && result.user ? result : null;
    },
    async currentIdToken() {
      const user = auth().currentUser;
      if (!user) return null;
      return user.getIdToken(true);
    },
    signOut: () => auth().signOut(),
  };
}
