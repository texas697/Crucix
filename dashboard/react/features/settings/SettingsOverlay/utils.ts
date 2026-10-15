import type { LlmProvider, PublicLlm } from '../../../api/types';
import type { SettingsHints } from './types';

export interface DeriveHintsArgs {
  providers: LlmProvider[];
  provider: string;
  savedLlm: PublicLlm | null;
}

export function deriveHints({ providers, provider, savedLlm }: DeriveHintsArgs): SettingsHints {
  const meta = providers.find((p) => p.id === provider);
  const isSameProvider = savedLlm?.provider === provider;
  return {
    showBaseUrl: Boolean(meta?.needsBaseUrl) || provider === 'openai',
    modelHint: meta?.defaultModel ? `Default: ${meta.defaultModel}` : 'Required for custom endpoints',
    keyHint: isSameProvider && savedLlm?.hasKey
      ? `Saved key ${savedLlm.keyHint} — leave blank to keep it`
      : (meta?.needsKey ? 'Required' : 'Optional'),
  };
}

export function confirmRemoveDefault(): boolean {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
  return window.confirm('Remove your API key and personal ideas from this server?');
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Request failed';
}
