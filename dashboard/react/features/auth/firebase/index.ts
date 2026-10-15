export { createFirebaseAdapter } from './createFirebaseAdapter';
export { GOOGLE_REDIRECT_KEY, NOT_READY_MESSAGE } from './consts';
export { firebaseErrorCode, firebaseErrorMessage } from './errors';
export { readAuthGlobals } from './globals';
export { hasGoogleRedirectMarker } from './redirectMarker';
export type {
  AuthGlobals,
  CreateFirebaseAdapterArgs,
  FirebaseAdapter,
  FirebaseAuthFactory,
  FirebaseAuthLike,
  FirebaseCredentialLike,
  FirebaseNamespaceLike,
  FirebaseUserLike,
  GoogleAuthProviderLike,
} from './types';
