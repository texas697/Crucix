export function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function currentPathWithSearch(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search;
}

export function redirectToLogin(reason?: string): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (reason) params.set('reason', reason);
  params.set('next', currentPathWithSearch());
  window.location.replace(`/login?${params.toString()}`);
}

export function locationHostname(): string {
  return typeof window !== 'undefined' ? window.location.hostname : '';
}
