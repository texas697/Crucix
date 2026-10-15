import { GOOGLE_REDIRECT_KEY } from './consts';

function readMarker(): string | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(GOOGLE_REDIRECT_KEY) : null;
  } catch {
    return null;
  }
}

export function writeGoogleRedirectMarker(): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(GOOGLE_REDIRECT_KEY, '1');
  } catch {
    return;
  }
}

export function clearGoogleRedirectMarker(): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
  } catch {
    return;
  }
}

export function hasGoogleRedirectMarker(): boolean {
  return readMarker() !== null;
}
