// AES-256-GCM envelope for user-supplied API keys (BYOK).
// Keys are encrypted at rest in Firestore with BYOK_ENCRYPTION_KEY (32 bytes, hex or base64).

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function loadKey() {
  const raw = process.env.BYOK_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(raw.trim()) ? Buffer.from(raw.trim(), 'hex') : Buffer.from(raw.trim(), 'base64');
  if (buf.length !== 32) throw new Error('BYOK_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)');
  return buf;
}

const KEY = loadKey();
export const encryptionAvailable = !!KEY;

export function encryptSecret(plain) {
  if (!KEY) throw new Error('BYOK_ENCRYPTION_KEY not set');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
}

export function decryptSecret(blob) {
  if (!KEY) throw new Error('BYOK_ENCRYPTION_KEY not set');
  const [v, iv, tag, ct] = String(blob).split('.');
  if (v !== 'v1') throw new Error('Unknown ciphertext version');
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
}

/** "sk-ant-…4f2a" style hint — never reveals more than the first 6 and last 4 chars */
export function keyHint(plain) {
  const s = String(plain || '');
  if (s.length < 12) return '••••';
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}
