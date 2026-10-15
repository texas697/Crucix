import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../../api/client';
import type { PublicLlm, UserProfile } from '../../api/types';

// The BYOK settings modal, ported from openSettings()/saveLlmSettings()/testLlm()/removeLlm()/
// generateMyIdeas() in dashboard/public/jarvis.html (markup at lines 781-809, handlers at 902-985).
//
// It is framework-agnostic: it takes the current profile and the api client as props and reports
// profile/ideas changes back to the host instead of reading or writing host globals. The API key
// draft lives only in this component's state and is cleared the moment it is saved or removed — it
// is never written to history, storage, logs or the URL.

export interface SettingsOverlayProps {
  open: boolean;
  me: UserProfile | null;
  api: ApiClient;
  onClose: () => void;
  /** Called with the updated profile after save/remove so the host can refresh. */
  onProfileChange?: (me: UserProfile | null) => void;
  /** Called with the ideas payload after a successful generate. */
  onIdeas?: (payload: unknown) => void;
  /** Confirmation before removing a saved key (defaults to window.confirm, as the legacy did). */
  confirmRemove?: () => boolean;
}

type Busy = null | 'save' | 'test' | 'generate' | 'remove';
interface Msg { text: string; cls: '' | 'ok' | 'err' }

interface TestResult { provider?: string; model?: string; ms?: number }
interface IdeasResult { ideas?: unknown[]; provider?: string }

const TITLE_ID = 'settings-title';

export function SettingsOverlay({
  open, me, api, onClose, onProfileChange, onIdeas,
  confirmRemove = () => (typeof window !== 'undefined' && typeof window.confirm === 'function'
    ? window.confirm('Remove your API key and personal ideas from this server?')
    : true),
}: SettingsOverlayProps) {
  const [provider, setProvider] = useState('anthropic');
  const [key, setKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [autoIdeas, setAutoIdeas] = useState(false);
  const [savedLlm, setSavedLlm] = useState<PublicLlm | null>(null);
  const [msg, setMsg] = useState<Msg>({ text: '', cls: '' });
  const [busy, setBusy] = useState<Busy>(null);
  const busyRef = useRef(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Reset the form fields from a saved llm (or clear them). Always drops the key draft.
  const applyLlm = useCallback((llm: PublicLlm | null) => {
    setProvider(llm?.provider || 'anthropic');
    setModel(llm?.model || '');
    setBaseUrl(llm?.baseUrl || '');
    setAutoIdeas(!!llm?.autoIdeas);
    setKey('');
    setSavedLlm(llm);
  }, []);

  // Seed the form each time the overlay opens. Resets any in-flight draft and message.
  useEffect(() => {
    if (!open) return;
    applyLlm(me?.llm ?? null);
    setMsg({ text: '', cls: '' });
    setBusy(null);
    busyRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes; focus moves into the dialog and is restored when it closes/unmounts.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    selectRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const providers = me?.providers ?? [];
  const meta = providers.find((p) => p.id === provider);
  const showBaseUrl = !!meta?.needsBaseUrl || provider === 'openai';
  const modelHint = meta?.defaultModel ? `Default: ${meta.defaultModel}` : 'Required for custom endpoints';
  const sameProvider = savedLlm?.provider === provider;
  const keyHint = sameProvider && savedLlm?.hasKey
    ? `Saved key ${savedLlm.keyHint} — leave blank to keep it`
    : (meta?.needsKey ? 'Required' : 'Optional');

  const guard = () => {
    if (busyRef.current) return false;
    busyRef.current = true;
    return true;
  };
  const release = () => { busyRef.current = false; setBusy(null); };
  const fail = (err: unknown) => setMsg({ text: err instanceof Error ? err.message : 'Request failed', cls: 'err' });

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || !guard()) return;
    setBusy('save');
    setMsg({ text: 'Saving…', cls: '' });
    const body: Record<string, unknown> = { provider, model, baseUrl, autoIdeas };
    if (key) body.apiKey = key;
    try {
      const r = await api.put<{ llm?: PublicLlm | null }>('/api/me/llm', body);
      const updated = r?.llm ?? null;
      applyLlm(updated);
      setMsg({ text: 'Saved. Test the key, then generate ideas.', cls: 'ok' });
      onProfileChange?.({ ...me, llm: updated });
    } catch (err) {
      fail(err);
    } finally {
      release();
    }
  };

  const onTest = async () => {
    if (!guard()) return;
    setBusy('test');
    setMsg({ text: 'Calling provider…', cls: '' });
    try {
      const r = await api.post<TestResult>('/api/me/llm/test');
      setMsg({ text: `OK — ${r?.provider} / ${r?.model} answered in ${r?.ms} ms`, cls: 'ok' });
    } catch (err) {
      fail(err);
    } finally {
      release();
    }
  };

  const onRemove = async () => {
    if (!me || !guard()) return;
    if (!confirmRemove()) return;
    setBusy('remove');
    setMsg({ text: '', cls: '' });
    try {
      await api.del('/api/me/llm');
      applyLlm(null);
      setMsg({ text: 'Removed.', cls: 'ok' });
      onProfileChange?.({ ...me, llm: null });
    } catch (err) {
      fail(err);
    } finally {
      release();
    }
  };

  const onGenerate = async () => {
    if (!savedLlm || !guard()) return;
    setBusy('generate');
    setMsg({ text: 'Generating ideas with your key (10–60 s)…', cls: '' });
    try {
      const payload = await api.post<IdeasResult>('/api/ideas');
      const n = payload?.ideas?.length ?? 0;
      setMsg({ text: `Generated ${n} ideas via ${payload?.provider}.`, cls: 'ok' });
      onIdeas?.(payload);
    } catch (err) {
      fail(err);
    } finally {
      release();
    }
  };

  if (!open || !me) return null;

  const disabled = busy !== null;

  return (
    <div className="glossary-overlay show" data-surface="settings" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glossary-panel" role="dialog" aria-modal="true" aria-labelledby={TITLE_ID}>
        <div className="glossary-head">
          <div>
            <div className="glossary-kicker">Step 1 of 1 · Bring your own key</div>
            <div className="glossary-title" id={TITLE_ID}>Enter your LLM API key</div>
            <div className="glossary-sub" id="settingsWho">
              {`Signed in as ${me.email}. `}
              {me.byokEnabled
                ? 'Your key is encrypted at rest and only used for your requests.'
                : 'BYOK is disabled on this server (missing encryption key).'}
            </div>
          </div>
          <button className="glossary-close" type="button" onClick={onClose} aria-label="Close settings">&times;</button>
        </div>
        <div className="glossary-body">
          <form id="llmForm" onSubmit={onSave}>
            <div className="set-field">
              <label htmlFor="llmProvider">Provider</label>
              <select id="llmProvider" ref={selectRef} value={provider} onChange={(e) => setProvider(e.target.value)}>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="set-field">
              <label htmlFor="llmKey">API key</label>
              <input id="llmKey" type="password" autoComplete="off" spellCheck={false} placeholder="paste your key here (e.g. sk-ant-… / sk-… / AIza…)" value={key} onChange={(e) => setKey(e.target.value)} />
              <div className="hint" id="llmKeyHint">{keyHint}</div>
            </div>
            <div className="set-field">
              <label htmlFor="llmModel">Model <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input id="llmModel" type="text" autoComplete="off" spellCheck={false} placeholder="provider default" value={model} onChange={(e) => setModel(e.target.value)} />
              <div className="hint" id="llmModelHint">{modelHint}</div>
            </div>
            {showBaseUrl && (
              <div className="set-field" id="llmBaseUrlField">
                <label htmlFor="llmBaseUrl">Base URL</label>
                <input id="llmBaseUrl" type="url" autoComplete="off" spellCheck={false} placeholder="https://api.groq.com/openai/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
                <div className="hint">Any OpenAI-compatible chat/completions endpoint (Groq, Together, DeepSeek, a public LM Studio tunnel…).</div>
              </div>
            )}
            <label className="set-check">
              <input id="llmAuto" type="checkbox" checked={autoIdeas} onChange={(e) => setAutoIdeas(e.target.checked)} />
              Auto-refresh my ideas after every sweep (uses your key ~4×/hour)
            </label>
            <div className="set-actions">
              <button className="set-btn primary" type="submit" id="llmSave" disabled={disabled}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
              {savedLlm && (
                <button className="set-btn" type="button" id="llmTest" onClick={onTest} disabled={disabled}>{busy === 'test' ? 'Testing…' : 'Test key'}</button>
              )}
              {savedLlm && (
                <button className="set-btn" type="button" id="llmGen" onClick={onGenerate} disabled={disabled}>{busy === 'generate' ? 'GENERATING…' : 'Generate ideas now'}</button>
              )}
              {savedLlm && (
                <button className="set-btn danger" type="button" id="llmRemove" onClick={onRemove} disabled={disabled}>{busy === 'remove' ? 'Removing…' : 'Remove'}</button>
              )}
            </div>
            <div className={`set-msg ${msg.cls}`} id="llmMsg">{msg.text}</div>
          </form>
        </div>
        <div className="glossary-foot">Keys never leave the server unencrypted and are never written to logs or sweep files. Remove your key at any time.</div>
      </div>
    </div>
  );
}
