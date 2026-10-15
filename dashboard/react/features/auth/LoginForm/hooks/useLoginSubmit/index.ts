import { useCallback, type FormEvent } from 'react';
import type { FirebaseAdapter } from '../../../firebase';
import { MESSAGES } from '../../consts';
import type { EstablishSession, LoginFormState } from '../../types';
import { errorMessageFor } from '../../utils';

export interface UseLoginSubmitArgs {
  adapter: FirebaseAdapter;
  form: LoginFormState;
  onEstablish: EstablishSession;
}

export function useLoginSubmit({ adapter, form, onEstablish }: UseLoginSubmitArgs) {
  const { mode, email, password, busy, setBusy, setMessage } = form;

  const onReset = useCallback(async () => {
    const emailValue = email.trim();
    if (!emailValue) {
      setMessage(MESSAGES.resetNeedsEmail);
      return;
    }
    setBusy('form');
    setMessage(MESSAGES.sendingReset);
    try {
      await adapter.resetPassword(emailValue);
      setMessage(MESSAGES.resetSent);
    } catch (err) {
      setMessage(errorMessageFor(err));
    } finally {
      setBusy(null);
    }
  }, [adapter, email, setBusy, setMessage]);

  const onCredentials = useCallback(async () => {
    setBusy('form');
    setMessage(MESSAGES.authenticating);
    try {
      const cred = mode === 'signup'
        ? await adapter.signUp(email.trim(), password)
        : await adapter.signIn(email.trim(), password);
      await onEstablish(cred.user);
    } catch (err) {
      setMessage(errorMessageFor(err));
      setBusy(null);
    }
  }, [adapter, email, mode, onEstablish, password, setBusy, setMessage]);

  return useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!adapter.ready || busy) return;
      if (mode === 'reset') await onReset();
      else await onCredentials();
    },
    [adapter.ready, busy, mode, onCredentials, onReset],
  );
}
