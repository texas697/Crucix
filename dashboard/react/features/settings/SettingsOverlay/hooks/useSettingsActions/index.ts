import { useCallback, useRef } from 'react';
import type { ApiClient } from '../../../../../api/client';
import type { PublicLlm, UserProfile } from '../../../../../api/types';
import type { SettingsActions, SettingsFormState } from '../../types';
import { errorText } from '../../utils';

export interface UseSettingsActionsArgs {
  form: SettingsFormState;
  me: UserProfile | null;
  api: ApiClient;
  onConfirmRemove: () => boolean;
  onProfileChange?: (me: UserProfile | null) => void;
  onIdeas?: (payload: unknown) => void;
}

interface TestResult { provider?: string; model?: string; ms?: number }
interface IdeasResult { ideas?: unknown[]; provider?: string }

export function useSettingsActions({ form, me, api, onConfirmRemove, onProfileChange, onIdeas }: UseSettingsActionsArgs): SettingsActions {
  const busyRef = useRef(false);
  const { provider, apiKey, model, baseUrl, isAutoIdeas, savedLlm, setMessage, setBusy, onApplyLlm } = form;

  const acquire = useCallback((kind: Exclude<SettingsFormState['busy'], null>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(kind);
    return true;
  }, [setBusy]);

  const release = useCallback(() => {
    busyRef.current = false;
    setBusy(null);
  }, [setBusy]);

  const onSave = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!me || !acquire('save')) return;
    setMessage({ text: 'Saving…', tone: '' });
    const body: Record<string, unknown> = { provider, model, baseUrl, autoIdeas: isAutoIdeas };
    if (apiKey) body.apiKey = apiKey;
    try {
      const result = await api.put<{ llm?: PublicLlm | null }>('/api/me/llm', body);
      const updated = result?.llm ?? null;
      onApplyLlm(updated);
      setMessage({ text: 'Saved. Test the key, then generate ideas.', tone: 'ok' });
      onProfileChange?.({ ...me, llm: updated });
    } catch (err) {
      setMessage({ text: errorText(err), tone: 'err' });
    } finally {
      release();
    }
  }, [me, acquire, release, provider, model, baseUrl, isAutoIdeas, apiKey, api, onApplyLlm, setMessage, onProfileChange]);

  const onTest = useCallback(async () => {
    if (!acquire('test')) return;
    setMessage({ text: 'Calling provider…', tone: '' });
    try {
      const result = await api.post<TestResult>('/api/me/llm/test');
      setMessage({ text: `OK — ${result?.provider} / ${result?.model} answered in ${result?.ms} ms`, tone: 'ok' });
    } catch (err) {
      setMessage({ text: errorText(err), tone: 'err' });
    } finally {
      release();
    }
  }, [acquire, release, api, setMessage]);

  const onRemove = useCallback(async () => {
    if (!me || !onConfirmRemove() || !acquire('remove')) return;
    setMessage({ text: '', tone: '' });
    try {
      await api.del('/api/me/llm');
      onApplyLlm(null);
      setMessage({ text: 'Removed.', tone: 'ok' });
      onProfileChange?.({ ...me, llm: null });
    } catch (err) {
      setMessage({ text: errorText(err), tone: 'err' });
    } finally {
      release();
    }
  }, [me, onConfirmRemove, acquire, release, api, onApplyLlm, setMessage, onProfileChange]);

  const onGenerate = useCallback(async () => {
    if (!savedLlm || !acquire('generate')) return;
    setMessage({ text: 'Generating ideas with your key (10–60 s)…', tone: '' });
    try {
      const payload = await api.post<IdeasResult>('/api/ideas');
      const count = payload?.ideas?.length ?? 0;
      setMessage({ text: `Generated ${count} ideas via ${payload?.provider}.`, tone: 'ok' });
      onIdeas?.(payload);
    } catch (err) {
      setMessage({ text: errorText(err), tone: 'err' });
    } finally {
      release();
    }
  }, [savedLlm, acquire, release, api, setMessage, onIdeas]);

  return { onSave, onTest, onRemove, onGenerate };
}
