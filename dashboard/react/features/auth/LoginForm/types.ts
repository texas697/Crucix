import type { ChangeEvent, FormEvent } from 'react';
import type { ApiClient } from '../../../api/client';
import type { FirebaseAdapter, FirebaseUserLike } from '../firebase';

export type LoginMode = 'signin' | 'signup' | 'reset';

export type LoginBusy = null | 'form' | 'google';

export type LoginMessageTone = '' | 'ok' | 'err';

export interface LoginMessage {
  text: string;
  tone: LoginMessageTone;
}

export interface LoginFormProps {
  adapter: FirebaseAdapter;
  reason?: string | null;
  next: string;
  onSession: (user: unknown) => void;
  api?: ApiClient;
  navigate?: (href: string) => void;
}

export interface LoginFormState {
  mode: LoginMode;
  email: string;
  password: string;
  busy: LoginBusy;
  message: LoginMessage;
  setMode: (mode: LoginMode) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setBusy: (busy: LoginBusy) => void;
  setMessage: (message: LoginMessage) => void;
}

export type EstablishSession = (user: FirebaseUserLike) => Promise<void>;

export type TextChange = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export interface LoginActions {
  onSelectMode: (mode: LoginMode) => void;
  onEmailChange: (event: TextChange) => void;
  onPasswordChange: (event: TextChange) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onGoogle: () => Promise<void>;
}
