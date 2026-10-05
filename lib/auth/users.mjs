// Per-user settings store (Firestore). Holds BYOK LLM config and the user's last ideas.
//   users/{uid} = {
//     email, createdAt, updatedAt,
//     llm: { provider, model, baseUrl, keyEnc, keyHint, autoIdeas, updatedAt },
//     ideas: { ideas: [...], generatedAt, sweepTimestamp, provider, model }
//   }

import { db } from './firebase.mjs';
import { encryptSecret, decryptSecret, keyHint, encryptionAvailable } from './crypto.mjs';
import { createLLMProvider } from '../llm/index.mjs';

export const SUPPORTED_PROVIDERS = [
  { id: 'anthropic',         label: 'Anthropic (Claude)',          needsKey: true,  defaultModel: 'claude-sonnet-4-6' },
  { id: 'openai',            label: 'OpenAI',                      needsKey: true,  defaultModel: 'gpt-5.4' },
  { id: 'openai-compatible', label: 'OpenAI-compatible (custom URL)', needsKey: false, defaultModel: '' , needsBaseUrl: true },
  { id: 'openrouter',        label: 'OpenRouter',                  needsKey: true,  defaultModel: 'openrouter/auto' },
  { id: 'gemini',            label: 'Google Gemini',               needsKey: true,  defaultModel: 'gemini-3.1-pro' },
  { id: 'grok',              label: 'xAI Grok',                    needsKey: true,  defaultModel: 'grok-4-latest' },
  { id: 'mistral',           label: 'Mistral',                     needsKey: true,  defaultModel: 'mistral-large-latest' },
  { id: 'minimax',           label: 'MiniMax',                     needsKey: true,  defaultModel: 'MiniMax-M2.5' },
];
const PROVIDER_IDS = new Set(SUPPORTED_PROVIDERS.map(p => p.id));

const col = () => db().collection('users');

function publicLlm(llm) {
  if (!llm?.provider) return null;
  return {
    provider: llm.provider,
    model: llm.model || null,
    baseUrl: llm.baseUrl || null,
    hasKey: !!llm.keyEnc,
    keyHint: llm.keyHint || null,
    autoIdeas: !!llm.autoIdeas,
    updatedAt: llm.updatedAt || null,
  };
}

export async function getUser(user) {
  const snap = await col().doc(user.uid).get();
  const data = snap.exists ? snap.data() : {};
  return {
    uid: user.uid,
    email: user.email,
    llm: publicLlm(data.llm),
    ideas: data.ideas || null,
  };
}

export async function touchUser(user) {
  await col().doc(user.uid).set({ email: user.email, lastLoginAt: new Date().toISOString() }, { merge: true });
}

function validateBaseUrl(url) {
  if (!url) return null;
  let u;
  try { u = new URL(url); } catch { throw Object.assign(new Error('baseUrl must be a valid URL'), { status: 400 }); }
  if (!['http:', 'https:'].includes(u.protocol)) throw Object.assign(new Error('baseUrl must be http(s)'), { status: 400 });
  const host = u.hostname;
  // Block SSRF into the hosting network — users may only point at public hosts.
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[::1\]|metadata)/i.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw Object.assign(new Error('baseUrl must be a public host'), { status: 400 });
  }
  return u.toString().replace(/\/+$/, '');
}

/**
 * Save BYOK settings. `apiKey` undefined = keep existing key; '' or null = remove key.
 */
export async function saveLlmSettings(user, input) {
  if (!encryptionAvailable) throw Object.assign(new Error('Server is missing BYOK_ENCRYPTION_KEY; BYOK is disabled'), { status: 503 });
  const provider = String(input.provider || '').toLowerCase().trim();
  if (!PROVIDER_IDS.has(provider)) throw Object.assign(new Error(`Unsupported provider "${provider}"`), { status: 400 });
  const meta = SUPPORTED_PROVIDERS.find(p => p.id === provider);

  const ref = col().doc(user.uid);
  const existing = (await ref.get()).data()?.llm || {};

  const model = String(input.model || '').trim().slice(0, 120) || meta.defaultModel || null;
  const baseUrl = meta.needsBaseUrl || provider === 'openai' ? validateBaseUrl(String(input.baseUrl || '').trim()) : null;
  if (meta.needsBaseUrl && !baseUrl) throw Object.assign(new Error('baseUrl is required for openai-compatible'), { status: 400 });

  let keyEnc = existing.keyEnc || null;
  let hint = existing.keyHint || null;
  if (input.apiKey !== undefined) {
    const k = String(input.apiKey || '').trim();
    if (k) {
      if (k.length > 512) throw Object.assign(new Error('apiKey too long'), { status: 400 });
      keyEnc = encryptSecret(k);
      hint = keyHint(k);
    } else { keyEnc = null; hint = null; }
  }
  if (meta.needsKey && !keyEnc) throw Object.assign(new Error(`${meta.label} requires an API key`), { status: 400 });

  const llm = {
    provider, model, baseUrl, keyEnc, keyHint: hint,
    autoIdeas: input.autoIdeas === undefined ? !!existing.autoIdeas : !!input.autoIdeas,
    updatedAt: new Date().toISOString(),
  };
  await ref.set({ email: user.email, llm, updatedAt: llm.updatedAt }, { merge: true });
  return publicLlm(llm);
}

export async function clearLlmSettings(user) {
  const { FieldValue } = await import('firebase-admin/firestore');
  await col().doc(user.uid).set({ llm: FieldValue.delete(), ideas: FieldValue.delete(), updatedAt: new Date().toISOString() }, { merge: true });
}

/** Build a live provider from the user's stored settings (decrypts the key in memory only). */
export async function providerForUser(uid) {
  const data = (await col().doc(uid).get()).data();
  const llm = data?.llm;
  if (!llm?.provider) return null;
  const apiKey = llm.keyEnc ? decryptSecret(llm.keyEnc) : null;
  const provider = createLLMProvider({ provider: llm.provider, apiKey, model: llm.model, baseUrl: llm.baseUrl });
  return provider?.isConfigured ? provider : null;
}

export async function saveUserIdeas(uid, payload) {
  await col().doc(uid).set({ ideas: payload }, { merge: true });
}

export async function listAutoIdeaUsers() {
  const snap = await col().where('llm.autoIdeas', '==', true).limit(200).get();
  return snap.docs.map(d => ({ uid: d.id, email: d.data().email }));
}
