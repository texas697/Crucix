export interface FirebaseUserLike {
  uid?: string;
  email?: string | null;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

export interface FirebaseCredentialLike {
  user: FirebaseUserLike;
}

export interface GoogleAuthProviderLike {
  setCustomParameters(params: Record<string, string>): void;
}

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

export interface FirebaseAuthFactory {
  (): FirebaseAuthLike;
  GoogleAuthProvider: new () => GoogleAuthProviderLike;
}

export interface FirebaseNamespaceLike {
  initializeApp(config: unknown): unknown;
  auth: FirebaseAuthFactory;
}

export interface FirebaseErrorLike {
  code?: unknown;
  message?: unknown;
}

export interface FirebaseAdapter {
  readonly ready: boolean;
  readonly allowSignup: boolean;
  signIn(email: string, password: string): Promise<FirebaseCredentialLike>;
  signUp(email: string, password: string): Promise<FirebaseCredentialLike>;
  resetPassword(email: string): Promise<void>;
  signInWithGoogle(): Promise<FirebaseCredentialLike | null>;
  completeGoogleRedirect(): Promise<FirebaseCredentialLike | null>;
  currentIdToken(): Promise<string | null>;
  signOut(): Promise<void>;
}

export interface CreateFirebaseAdapterArgs {
  firebase?: FirebaseNamespaceLike | null;
  config?: unknown;
  allowSignup?: boolean;
}

export interface AuthGlobals {
  firebase?: FirebaseNamespaceLike | null;
  __FIREBASE_CONFIG__?: unknown;
  __ALLOW_SIGNUP__?: boolean;
}
