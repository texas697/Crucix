import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { getCredentials } from './credentials.mjs';
import { formatDialog, formatMessage, toEntity } from './format.mjs';

export { hasTelegramCredentials } from './credentials.mjs';

const DIALOGS_TTL_MS = 30000;
const MESSAGES_TTL_MS = 15000;

let clientInstance = null;
let clientConnecting = null;
let dialogsCache = null;
let dialogsCachedAt = 0;
const messagesCache = new Map();

export async function getClient() {
  const { apiId, apiHash, session } = getCredentials();
  if (!apiId || !apiHash || !session) {
    throw new Error('Telegram credentials incomplete: TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION required.');
  }
  if (clientInstance && clientInstance.connected) return clientInstance;
  if (clientConnecting) return clientConnecting;
  clientConnecting = (async () => {
    try {
      const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 3, useWSS: false });
      await client.connect();
      clientInstance = client;
      return client;
    } finally {
      clientConnecting = null;
    }
  })();
  return clientConnecting;
}

export async function getTelegramStatus() {
  const { apiId, apiHash, session } = getCredentials();
  const configured = Boolean(apiId && apiHash);
  const authenticated = Boolean(session);
  if (!configured || !authenticated) {
    const message = configured
      ? 'Telegram session missing. Run `npm run telegram:auth` to authenticate.'
      : 'Telegram API credentials missing.';
    return { configured, authenticated, connected: false, message };
  }
  try {
    const client = await getClient();
    await client.getMe();
    return { configured: true, authenticated: true, connected: true };
  } catch (err) {
    return { configured: true, authenticated: true, connected: false, error: err.message || 'Failed to connect to Telegram' };
  }
}

export async function getTelegramDialogs({ limit = 100 } = {}) {
  const now = Date.now();
  if (dialogsCache && now - dialogsCachedAt < DIALOGS_TTL_MS) return dialogsCache;
  const client = await getClient();
  const dialogs = await client.getDialogs({ limit });
  dialogsCache = dialogs.map(formatDialog);
  dialogsCachedAt = now;
  return dialogsCache;
}

export async function getTelegramMessages(chatId, { limit = 50 } = {}) {
  const now = Date.now();
  const cacheKey = `${chatId}:${limit}`;
  const cached = messagesCache.get(cacheKey);
  if (cached && now - cached.cachedAt < MESSAGES_TTL_MS) return cached.data;
  const client = await getClient();
  const messages = await client.getMessages(toEntity(chatId), { limit });
  const data = messages.map(formatMessage);
  messagesCache.set(cacheKey, { data, cachedAt: now });
  return data;
}
