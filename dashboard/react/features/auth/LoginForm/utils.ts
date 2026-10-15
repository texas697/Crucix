import { firebaseErrorCode, firebaseErrorMessage } from '../firebase';
import { EMPTY_MESSAGE, MESSAGES } from './consts';
import type { LoginMessage } from './types';

const FRIENDLY_BY_CODE: ReadonlyArray<readonly [string[], string]> = [
  [['user-not-found', 'wrong-password', 'invalid-credential'], 'Invalid email or password.'],
  [['email-already-in-use'], 'That email already has an account — sign in instead.'],
  [['weak-password'], 'Password must be at least 8 characters.'],
  [['too-many-requests'], 'Too many attempts — wait a minute and retry.'],
  [['operation-not-allowed'], 'This sign-in method is not enabled in Firebase.'],
  [['unauthorized-domain'], 'This domain is not authorized in Firebase Auth settings.'],
  [['account-exists-with-different-credential'], 'That email already uses a different sign-in method.'],
];

export function friendlyError(err: unknown): string {
  const code = firebaseErrorCode(err);
  const match = FRIENDLY_BY_CODE.find(([needles]) => needles.some((needle) => code.includes(needle)));
  if (match) return match[1];
  return firebaseErrorMessage(err) || 'Sign-in failed.';
}

export function errorMessageFor(err: unknown): LoginMessage {
  return { text: friendlyError(err), tone: 'err' };
}

export interface InitialMessageArgs {
  reason: string | null | undefined;
  isReady: boolean;
}

export function initialMessage({ reason, isReady }: InitialMessageArgs): LoginMessage {
  if (reason === 'expired') return MESSAGES.expired;
  if (!isReady) return MESSAGES.notReady;
  return EMPTY_MESSAGE;
}

export function currentOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function replaceLocation(href: string): void {
  if (typeof window !== 'undefined') window.location.replace(href);
}
