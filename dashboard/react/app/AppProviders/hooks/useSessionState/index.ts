import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, type ApiClient } from '../../../../api/client';
import type { UserProfile } from '../../../../api/types';
import { redirectToLogin } from '../../utils';
import type { SessionValue } from '../../types';

export interface UseSessionStateArgs {
  api: ApiClient;
}

async function probeMe(api: ApiClient): Promise<{ me: UserProfile | null; isExpired: boolean }> {
  try {
    const me = await api.get<UserProfile>('/api/me');
    return { me: me ?? null, isExpired: false };
  } catch (err) {
    const isExpired = err instanceof ApiError && err.status === 401;
    return { me: null, isExpired };
  }
}

export function useSessionState({ api }: UseSessionStateArgs): SessionValue {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let isActive = true;
    void probeMe(api).then(({ me: profile, isExpired }) => {
      if (!isActive) return;
      if (isExpired) {
        redirectToLogin();
        return;
      }
      setMe(profile);
      setIsResolved(true);
    });
    return () => { isActive = false; };
  }, [api]);

  const onLogout = useCallback(() => {
    void api.post('/api/logout').catch(() => undefined).then(() => {
      if (typeof window !== 'undefined') window.location.replace('/login');
    });
  }, [api]);

  return useMemo(() => ({ me, isResolved, setMe, onLogout }), [me, isResolved, onLogout]);
}
