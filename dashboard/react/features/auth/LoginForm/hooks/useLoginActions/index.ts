import { useCallback, useMemo } from 'react';
import type { FirebaseAdapter } from '../../../firebase';
import { EMPTY_MESSAGE } from '../../consts';
import type { EstablishSession, LoginActions, LoginFormState, LoginMode, TextChange } from '../../types';
import { useGoogleSignIn } from '../useGoogleSignIn';
import { useLoginSubmit } from '../useLoginSubmit';

export interface UseLoginActionsArgs {
  adapter: FirebaseAdapter;
  form: LoginFormState;
  onEstablish: EstablishSession;
}

export function useLoginActions({ adapter, form, onEstablish }: UseLoginActionsArgs): LoginActions {
  const { setMode, setEmail, setPassword, setMessage } = form;
  const onSubmit = useLoginSubmit({ adapter, form, onEstablish });
  const onGoogle = useGoogleSignIn({ adapter, form, onEstablish });

  const onSelectMode = useCallback(
    (mode: LoginMode) => {
      setMode(mode);
      setMessage(EMPTY_MESSAGE);
    },
    [setMode, setMessage],
  );
  const onEmailChange = useCallback((event: TextChange) => setEmail(event.target.value), [setEmail]);
  const onPasswordChange = useCallback((event: TextChange) => setPassword(event.target.value), [setPassword]);

  return useMemo(
    () => ({ onSelectMode, onEmailChange, onPasswordChange, onSubmit, onGoogle }),
    [onSelectMode, onEmailChange, onPasswordChange, onSubmit, onGoogle],
  );
}
