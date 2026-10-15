import { useCallback, useMemo, type ChangeEvent } from 'react';
import type { SettingsFieldHandlers, SettingsFormState } from '../../types';

export interface UseSettingsFieldHandlersArgs {
  form: SettingsFormState;
}

type TextChange = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function useSettingsFieldHandlers({ form }: UseSettingsFieldHandlersArgs): SettingsFieldHandlers {
  const { setProvider, setApiKey, setModel, setBaseUrl, setIsAutoIdeas } = form;
  const onProviderChange = useCallback((e: TextChange) => setProvider(e.target.value), [setProvider]);
  const onApiKeyChange = useCallback((e: TextChange) => setApiKey(e.target.value), [setApiKey]);
  const onModelChange = useCallback((e: TextChange) => setModel(e.target.value), [setModel]);
  const onBaseUrlChange = useCallback((e: TextChange) => setBaseUrl(e.target.value), [setBaseUrl]);
  const onAutoIdeasChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setIsAutoIdeas(e.target.checked),
    [setIsAutoIdeas],
  );
  return useMemo(
    () => ({ onProviderChange, onApiKeyChange, onModelChange, onBaseUrlChange, onAutoIdeasChange }),
    [onProviderChange, onApiKeyChange, onModelChange, onBaseUrlChange, onAutoIdeasChange],
  );
}
