import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicLlm, UserProfile } from '../../../../../api/types';
import type { SettingsBusy, SettingsFormState, SettingsMessage } from '../../types';

export interface UseSettingsFormArgs {
  isOpen: boolean;
  me: UserProfile | null;
}

const EMPTY_MESSAGE: SettingsMessage = { text: '', tone: '' };

export function useSettingsForm({ isOpen, me }: UseSettingsFormArgs): SettingsFormState {
  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isAutoIdeas, setIsAutoIdeas] = useState(false);
  const [savedLlm, setSavedLlm] = useState<PublicLlm | null>(null);
  const [message, setMessage] = useState<SettingsMessage>(EMPTY_MESSAGE);
  const [busy, setBusy] = useState<SettingsBusy>(null);

  const onApplyLlm = useCallback((llm: PublicLlm | null) => {
    setProvider(llm?.provider || 'anthropic');
    setModel(llm?.model || '');
    setBaseUrl(llm?.baseUrl || '');
    setIsAutoIdeas(Boolean(llm?.autoIdeas));
    setApiKey('');
    setSavedLlm(llm);
  }, []);

  const llmRef = useRef<PublicLlm | null>(me?.llm ?? null);
  useEffect(() => {
    llmRef.current = me?.llm ?? null;
  }, [me]);

  useEffect(() => {
    if (!isOpen) return;
    onApplyLlm(llmRef.current);
    setMessage(EMPTY_MESSAGE);
    setBusy(null);
  }, [isOpen, onApplyLlm]);

  return {
    provider, apiKey, model, baseUrl, isAutoIdeas, savedLlm, message, busy,
    setProvider, setApiKey, setModel, setBaseUrl, setIsAutoIdeas, setMessage, setBusy, onApplyLlm,
  };
}
