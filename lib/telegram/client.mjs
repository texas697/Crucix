import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

let clientInstance = null;
let clientConnecting = null;

let dialogsCache = null;
let dialogsCachedAt = 0;
const DIALOGS_TTL_MS = 30000;

const messagesCache = new Map();
const MESSAGES_TTL_MS = 15000;

function getCredentials() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || '', 10);
  const apiHash = (process.env.TELEGRAM_API_HASH || '').trim();
  const session = (process.env.TELEGRAM_SESSION || '').trim();
  return {
    apiId: isNaN(apiId) ? null : apiId,
    apiHash: apiHash || null,
    session: session || null,
  };
}

export function hasTelegramCredentials() {
  const { apiId, apiHash, session } = getCredentials();
  return Boolean(apiId && apiHash && session);
}

export async function getClient() {
  const { apiId, apiHash, session } = getCredentials();
  if (!apiId || !apiHash || !session) {
    throw new Error('Telegram credentials incomplete: TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION required.');
  }

  if (clientInstance && clientInstance.connected) {
    return clientInstance;
  }

  if (clientConnecting) {
    return clientConnecting;
  }

  clientConnecting = (async () => {
    try {
      const stringSession = new StringSession(session);
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 3,
        useWSS: false,
      });

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
    return {
      configured,
      authenticated,
      connected: false,
      message: !configured
        ? 'Telegram API credentials missing.'
        : 'Telegram session missing. Run `npm run telegram:auth` to authenticate.',
    };
  }

  try {
    const client = await getClient();
    const me = await client.getMe();
    return {
      configured: true,
      authenticated: true,
      connected: true,
      user: {
        id: String(me.id),
        firstName: me.firstName || '',
        username: me.username || '',
        phone: me.phone ? `+${me.phone.slice(-4).padStart(me.phone.length, '*')}` : '',
      },
    };
  } catch (err) {
    return {
      configured: true,
      authenticated: true,
      connected: false,
      error: err.message || 'Failed to connect to Telegram',
    };
  }
}

export async function getTelegramDialogs({ limit = 100 } = {}) {
  const now = Date.now();
  if (dialogsCache && (now - dialogsCachedAt) < DIALOGS_TTL_MS) {
    return dialogsCache;
  }

  const client = await getClient();
  const dialogs = await client.getDialogs({ limit });

  const formatted = dialogs.map((d) => {
    const isChannel = Boolean(d.isChannel);
    const isGroup = Boolean(d.isGroup);
    const isUser = Boolean(d.isUser);
    let type = 'chat';
    if (isChannel) type = 'channel';
    else if (isGroup) type = 'group';
    else if (isUser) type = 'user';

    return {
      id: String(d.id),
      title: d.title || d.name || 'Untitled',
      unreadCount: d.unreadCount || 0,
      type,
      date: d.date ? new Date(d.date * 1000).toISOString() : null,
      lastMessage: d.message ? {
        id: d.message.id,
        text: d.message.message || '',
        date: d.message.date ? new Date(d.message.date * 1000).toISOString() : null,
      } : null,
    };
  });

  dialogsCache = formatted;
  dialogsCachedAt = now;
  return formatted;
}

function resolveMediaType(media) {
  if (!media) return null;
  const className = media.className || media.constructor?.name || '';
  if (className.includes('Photo')) return 'photo';
  if (className.includes('Document')) {
    if (media.document?.mimeType?.startsWith('video/')) return 'video';
    if (media.document?.mimeType?.startsWith('audio/')) return 'audio';
    return 'document';
  }
  if (className.includes('WebPage')) return 'webpage';
  if (className.includes('Poll')) return 'poll';
  return 'media';
}

export async function getTelegramMessages(chatId, { limit = 50 } = {}) {
  const now = Date.now();
  const cacheKey = `${chatId}:${limit}`;
  const cached = messagesCache.get(cacheKey);
  if (cached && (now - cached.cachedAt) < MESSAGES_TTL_MS) {
    return cached.data;
  }

  const client = await getClient();

  let entity = chatId;
  try {
    const numeric = BigInt(chatId);
    entity = numeric;
  } catch {
    entity = chatId;
  }

  const messages = await client.getMessages(entity, { limit });

  const formatted = messages.map((m) => ({
    id: m.id,
    text: m.message || '',
    date: m.date ? new Date(m.date * 1000).toISOString() : null,
    senderId: m.senderId ? String(m.senderId) : null,
    out: Boolean(m.out),
    mediaType: resolveMediaType(m.media),
    replyToMsgId: m.replyTo ? m.replyTo.replyToMsgId : null,
  }));

  messagesCache.set(cacheKey, { data: formatted, cachedAt: now });
  return formatted;
}
