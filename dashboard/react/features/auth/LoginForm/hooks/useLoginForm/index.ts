import { useMemo, useState } from 'react';
import type { LoginBusy, LoginFormState, LoginMessage, LoginMode } from '../../types';
import { initialMessage } from '../../utils';

export interface UseLoginFormArgs {
  reason: string | null | undefined;
  isReady: boolean;
}

export function useLoginForm({ reason, isReady }: UseLoginFormArgs): LoginFormState {
  const [mode, setMode] = useState<LoginMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<LoginBusy>(null);
  const [message, setMessage] = useState<LoginMessage>(() => initialMessage({ reason, isReady }));

  return useMemo(
    () => ({ mode, email, password, busy, message, setMode, setEmail, setPassword, setBusy, setMessage }),
    [mode, email, password, busy, message],
  );
}
