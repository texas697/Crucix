import { useEffect, useRef } from 'react';
import { hasGoogleRedirectMarker, type FirebaseAdapter, type FirebaseCredentialLike } from '../../../firebase';
import { MESSAGES } from '../../consts';
import type { EstablishSession, LoginMessage } from '../../types';
import { errorMessageFor } from '../../utils';

export interface UseGoogleRedirectArgs {
  adapter: FirebaseAdapter;
  onEstablish: EstablishSession;
  setMessage: (message: LoginMessage) => void;
}

export function useGoogleRedirect({ adapter, onEstablish, setMessage }: UseGoogleRedirectArgs): void {
  const isHandledRef = useRef(false);

  useEffect(() => {
    if (!adapter.ready || isHandledRef.current) return;
    if (hasGoogleRedirectMarker()) setMessage(MESSAGES.finishingGoogle);
    isHandledRef.current = true;
    const onResult = async (cred: FirebaseCredentialLike | null) => {
      if (!cred?.user) return;
      setMessage(MESSAGES.finishingGoogle);
      await onEstablish(cred.user);
    };
    adapter.completeGoogleRedirect()
      .then(onResult)
      .catch((err: unknown) => setMessage(errorMessageFor(err)));
  }, [adapter, onEstablish, setMessage]);
}
