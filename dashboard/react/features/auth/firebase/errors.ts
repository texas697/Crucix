import { NOT_READY_MESSAGE } from './consts';
import type { FirebaseErrorLike } from './types';

export function firebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as FirebaseErrorLike).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

export function firebaseErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as FirebaseErrorLike).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

export function notReadyError(): Error {
  return new Error(NOT_READY_MESSAGE);
}
