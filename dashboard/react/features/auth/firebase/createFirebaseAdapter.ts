import { GOOGLE_PROVIDER_PARAMS, POPUP_DISMISS_CODES, POPUP_FALLBACK_CODES } from './consts';
import { firebaseErrorCode, notReadyError } from './errors';
import { readAuthGlobals } from './globals';
import { clearGoogleRedirectMarker, writeGoogleRedirectMarker } from './redirectMarker';
import type {
  CreateFirebaseAdapterArgs,
  FirebaseAdapter,
  FirebaseAuthLike,
  FirebaseNamespaceLike,
  GoogleAuthProviderLike,
} from './types';

function initializeOnce(fb: FirebaseNamespaceLike, config: unknown): void {
  try {
    fb.initializeApp(config);
  } catch {
    return;
  }
}

export function createFirebaseAdapter({ firebase, config, allowSignup }: CreateFirebaseAdapterArgs = {}): FirebaseAdapter {
  const globals = readAuthGlobals();
  const fb = firebase ?? globals.firebase ?? null;
  const webConfig = config ?? globals.__FIREBASE_CONFIG__;
  const isSignupAllowed = allowSignup ?? globals.__ALLOW_SIGNUP__ !== false;
  const ready = fb !== null && webConfig !== undefined && webConfig !== null;
  if (ready && fb) initializeOnce(fb, webConfig);

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
    provider.setCustomParameters(GOOGLE_PROVIDER_PARAMS);
    return provider;
  }

  async function googleRedirect(): Promise<null> {
    writeGoogleRedirectMarker();
    await auth().signInWithRedirect(googleProvider());
    return null;
  }

  return {
    ready,
    allowSignup: isSignupAllowed,
    signIn: (email, password) => auth().signInWithEmailAndPassword(email, password),
    signUp: (email, password) => auth().createUserWithEmailAndPassword(email, password),
    resetPassword: (email) => auth().sendPasswordResetEmail(email),
    async signInWithGoogle() {
      try {
        return await auth().signInWithPopup(googleProvider());
      } catch (err) {
        const code = firebaseErrorCode(err);
        if (POPUP_FALLBACK_CODES.has(code)) return googleRedirect();
        if (POPUP_DISMISS_CODES.has(code)) return null;
        throw err;
      }
    },
    async completeGoogleRedirect() {
      clearGoogleRedirectMarker();
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
