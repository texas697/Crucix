import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiClient } from '../../dashboard/react/api/client';
import type {
  FirebaseAdapter,
  FirebaseCredentialLike,
} from '../../dashboard/react/features/auth/firebaseAdapter';
import { friendlyError, LoginForm } from '../../dashboard/react/features/auth/LoginForm';
import { loginRedirectHref, safeNext } from '../../dashboard/react/features/auth/safeNext';

const ORIGIN = 'https://x.test';

function credential(token: string): FirebaseCredentialLike {
  return { user: { uid: 'u1', email: 'a@b.com', getIdToken: vi.fn(async () => token) } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function fakeAdapter(overrides: Partial<FirebaseAdapter> = {}): FirebaseAdapter {
  const base: FirebaseAdapter = {
    ready: true,
    allowSignup: true,
    signIn: vi.fn(async () => credential('tok-signin')),
    signUp: vi.fn(async () => credential('tok-signup')),
    resetPassword: vi.fn(async () => {}),
    signInWithGoogle: vi.fn(async () => credential('tok-google')),
    completeGoogleRedirect: vi.fn(async () => null),
    currentIdToken: vi.fn(async () => 'tok'),
    signOut: vi.fn(async () => {}),
  };
  return { ...base, ...overrides };
}

interface SetupOptions {
  adapter?: Partial<FirebaseAdapter>;
  next?: string;
  reason?: string | null;
}

function setup({ adapter: adapterOverrides, next = '/', reason = null }: SetupOptions = {}) {
  const adapter = fakeAdapter(adapterOverrides);
  const navigate = vi.fn();
  const onSession = vi.fn();
  const post = vi.fn(async () => ({ ok: true }));
  const api = {
    request: vi.fn(),
    get: vi.fn(),
    post,
    put: vi.fn(),
    del: vi.fn(),
  } as unknown as ApiClient;

  const utils = render(
    <LoginForm adapter={adapter} reason={reason} next={next} onSession={onSession} api={api} navigate={navigate} />,
  );
  return { ...utils, adapter, navigate, onSession, api, post };
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('safeNext', () => {
  const hostile = [
    '/\\evil.com', // backslash-smuggled protocol-relative
    '//evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '/\\/evil.com',
  ];

  it.each(hostile)('collapses the hostile value %s to /', (raw) => {
    expect(safeNext(raw, ORIGIN)).toBe('/');
  });

  it('keeps real same-origin paths', () => {
    expect(safeNext('/digest/abc?x=1', ORIGIN)).toBe('/digest/abc?x=1');
    // Percent-encoded backslash parses to the same origin and is safe to keep.
    expect(safeNext('/%5Cevil.com', ORIGIN)).toBe('/%5Cevil.com');
  });

  it('falls back to / for empty values and relative (non-path) input', () => {
    expect(safeNext(null, ORIGIN)).toBe('/');
    expect(safeNext(undefined, ORIGIN)).toBe('/');
    expect(safeNext('', ORIGIN)).toBe('/');
    expect(safeNext('evil.com', ORIGIN)).toBe('/');
  });

  it('builds an encoded login redirect href from a validated next', () => {
    expect(loginRedirectHref('//evil.com', ORIGIN)).toBe('/login?next=%2F');
    expect(loginRedirectHref('/digest/abc?x=1', ORIGIN)).toBe('/login?next=%2Fdigest%2Fabc%3Fx%3D1');
  });
});

describe('friendlyError', () => {
  it('maps bad credentials to a generic message', () => {
    expect(friendlyError({ code: 'auth/wrong-password' })).toBe('Invalid email or password.');
    expect(friendlyError({ code: 'auth/user-not-found' })).toBe('Invalid email or password.');
  });

  it('maps other known codes and falls back to the raw message', () => {
    expect(friendlyError({ code: 'auth/too-many-requests' })).toBe('Too many attempts — wait a minute and retry.');
    expect(friendlyError(new Error('boom'))).toBe('boom');
  });
});

describe('LoginForm modes', () => {
  it('renders the sign-in mode by default', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('switches to sign up, hiding the password requirement behind new-password', async () => {
    setup();
    await userEvent.click(screen.getByRole('tab', { name: 'Create account' }));
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('switches to reset, dropping the password field and sending a reset email', async () => {
    const { adapter } = setup();
    await userEvent.click(screen.getByRole('tab', { name: 'Forgot password' }));
    expect(screen.queryByLabelText('Password')).toBeNull();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));
    await waitFor(() => expect(adapter.resetPassword).toHaveBeenCalledWith('a@b.com'));
    expect(await screen.findByText('Password reset email sent.')).toBeInTheDocument();
  });

  it('hides the sign-up tab when the deployment disallows signup', () => {
    setup({ adapter: { allowSignup: false } });
    expect(screen.queryByRole('tab', { name: 'Create account' })).toBeNull();
  });
});

describe('LoginForm disabled and loading states', () => {
  it('renders disabled with a config notice when the adapter is not ready', () => {
    setup({ adapter: { ready: false } });
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
    expect(screen.getByText('Server is missing FIREBASE_WEB_CONFIG — auth cannot start.')).toBeInTheDocument();
  });

  it('shows a loading state while the credentials are being verified', async () => {
    const pending = deferred<FirebaseCredentialLike>();
    setup({ adapter: { signIn: vi.fn(() => pending.promise) } });
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const submit = screen.getByRole('button', { name: 'Authenticating…' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent('Authenticating…');

    pending.resolve(credential('tok'));
    await waitFor(() => expect(screen.getByText('Access granted — loading terminal…')).toBeInTheDocument());
  });
});

describe('LoginForm session exchange', () => {
  it('POSTs the ID token to /api/session and redirects to a safe next', async () => {
    const { api, post, navigate, onSession, adapter } = setup({ next: '/digest/abc?x=1' });
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/session', { idToken: 'tok-signin' }));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/digest/abc?x=1');
    expect(onSession).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1' }));
    expect(adapter.signOut).toHaveBeenCalled();
    // The ID token is never persisted anywhere.
    expect(Object.keys(localStorage)).toHaveLength(0);
    expect(sessionStorage.getItem('idToken')).toBeNull();
  });

  const hostile = ['/\\evil.com', '//evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\/evil.com'];

  it.each(hostile)('redirects a hostile next (%s) to /', async (raw) => {
    const { navigate } = setup({ next: raw });
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('shows the session-expired notice for reason=expired', () => {
    setup({ reason: 'expired' });
    expect(screen.getByText('Session expired — please sign in again.')).toBeInTheDocument();
  });

  it('maps a bad-credentials rejection to a friendly alert', async () => {
    setup({ adapter: { signIn: vi.fn(async () => { throw { code: 'auth/wrong-password' }; }) } });
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid email or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});

describe('LoginForm Google flow', () => {
  it('calls the adapter and establishes the session on popup success', async () => {
    const { adapter, post, navigate } = setup({ next: '/digest' });
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(adapter.signInWithGoogle).toHaveBeenCalled());
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/session', { idToken: 'tok-google' }));
    expect(navigate).toHaveBeenCalledWith('/digest');
  });

  it('re-enables the button when the popup is dismissed', async () => {
    setup({ adapter: { signInWithGoogle: vi.fn(async () => null) } });
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled());
  });
});
