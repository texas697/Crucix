import { NOT_READY_MESSAGE } from '../firebase';
import type { LoginMessage, LoginMode } from './types';

export const EMPTY_MESSAGE: LoginMessage = { text: '', tone: '' };

export const MESSAGES = {
  expired: { text: 'Session expired — please sign in again.', tone: 'err' },
  notReady: { text: NOT_READY_MESSAGE, tone: 'err' },
  granted: { text: 'Access granted — loading terminal…', tone: 'ok' },
  finishingGoogle: { text: 'Finishing Google sign-in…', tone: '' },
  resetNeedsEmail: { text: 'Enter your email first, then click Forgot password.', tone: 'err' },
  sendingReset: { text: 'Sending reset email…', tone: '' },
  resetSent: { text: 'Password reset email sent.', tone: 'ok' },
  authenticating: { text: 'Authenticating…', tone: '' },
  openingGoogle: {
    text: 'Opening Google sign-in… (if nothing appears, allow popups or use the redirect link below)',
    tone: '',
  },
} as const satisfies Record<string, LoginMessage>;

export const TITLES: Record<LoginMode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  reset: 'Sign in',
};

export const SUBMIT_LABELS: Record<LoginMode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  reset: 'Send reset email',
};

export const TAB_LABELS: Record<LoginMode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  reset: 'Forgot password',
};

export const TEXT = {
  sub: 'Access to this intelligence terminal requires an account.',
  tabsLabel: 'Authentication mode',
  google: 'Continue with Google',
  googleBusy: 'Opening Google…',
  divider: 'or use email',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: '••••••••••••',
  submitting: 'Authenticating…',
  foot: 'Your own LLM API key can be added after sign-in and is stored encrypted. Keys are only used to generate your trade ideas.',
} as const;

export const SESSION_PATH = '/api/session';

export const PASSWORD_MIN_LENGTH = 8;
