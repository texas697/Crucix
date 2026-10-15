import type { Dispatch, SetStateAction } from 'react';
import type { ApiClient } from '../../../api/client';
import type { PublicLlm, UserProfile } from '../../../api/types';

export type SettingsBusy = null | 'save' | 'test' | 'generate' | 'remove';

export type SettingsMessageTone = '' | 'ok' | 'err';

export interface SettingsMessage {
  text: string;
  tone: SettingsMessageTone;
}

export interface SettingsFormState {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  isAutoIdeas: boolean;
  savedLlm: PublicLlm | null;
  message: SettingsMessage;
  busy: SettingsBusy;
  setProvider: Dispatch<SetStateAction<string>>;
  setApiKey: Dispatch<SetStateAction<string>>;
  setModel: Dispatch<SetStateAction<string>>;
  setBaseUrl: Dispatch<SetStateAction<string>>;
  setIsAutoIdeas: Dispatch<SetStateAction<boolean>>;
  setMessage: Dispatch<SetStateAction<SettingsMessage>>;
  setBusy: Dispatch<SetStateAction<SettingsBusy>>;
  onApplyLlm: (llm: PublicLlm | null) => void;
}

export interface SettingsFieldHandlers {
  onProviderChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onApiKeyChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onModelChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBaseUrlChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onAutoIdeasChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface SettingsHints {
  showBaseUrl: boolean;
  modelHint: string;
  keyHint: string;
}

export interface SettingsActions {
  onSave: (event: React.FormEvent) => Promise<void>;
  onTest: () => Promise<void>;
  onRemove: () => Promise<void>;
  onGenerate: () => Promise<void>;
}

export interface SettingsOverlayProps {
  isOpen: boolean;
  me: UserProfile | null;
  api: ApiClient;
  onClose: () => void;
  onProfileChange?: (me: UserProfile | null) => void;
  onIdeas?: (payload: unknown) => void;
  onConfirmRemove?: () => boolean;
}
