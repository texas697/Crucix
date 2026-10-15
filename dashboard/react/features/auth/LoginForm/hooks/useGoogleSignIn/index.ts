import { useCallback } from 'react';
import type { FirebaseAdapter } from '../../../firebase';
import { MESSAGES } from '../../consts';
import type { EstablishSession, LoginFormState } from '../../types';
import { errorMessageFor } from '../../utils';

export interface UseGoogleSignInArgs {
  adapter: FirebaseAdapter;
  form: LoginFormState;
  onEstablish: EstablishSession;
}

export function useGoogleSignIn({ adapter, form, onEstablish }: UseGoogleSignInArgs) {
  const { busy, setBusy, setMessage } = form;

  return useCallback(async () => {
    if (!adapter.ready || busy) return;
    setBusy('google');
    setMessage(MESSAGES.openingGoogle);
    try {
      const cred = await adapter.signInWithGoogle();
      if (cred?.user) await onEstablish(cred.user);
      else setBusy(null);
    } catch (err) {
      setMessage(errorMessageFor(err));
      setBusy(null);
    }
  }, [adapter, busy, onEstablish, setBusy, setMessage]);
}
