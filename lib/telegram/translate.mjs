const SYSTEM = [
  'You translate Telegram posts into natural English for an intelligence dashboard.',
  'Input is a JSON array of {id, text}. Reply with ONLY a JSON array of {id, from, text}:',
  'from = ISO 639-1 code of the source language, text = faithful English translation keeping line breaks,',
  'handles, hashtags and URLs unchanged. If a post is already English, return it unchanged with from="en".',
].join(' ');

const MAX_CACHE = 2000;
const BATCH = 5;

function parseArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createTranslator({ provider, log = console }) {
  const cache = new Map();

  function remember(key, value) {
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(key, value);
  }

  async function translateBatch(chatId, items) {
    const user = JSON.stringify(items.map((m) => ({ id: m.id, text: m.text })));
    const r = await provider.complete(SYSTEM, user, { maxTokens: 6000, timeout: 110000 });
    for (const row of parseArray(r.text)) {
      if (row && row.id != null && typeof row.text === 'string') {
        remember(`${chatId}:${row.id}`, { text: row.text, from: String(row.from || '').toLowerCase() || null });
      }
    }
  }

  async function translate(chatId, messages) {
    if (!provider?.isConfigured) return messages;
    const pending = messages.filter((m) => m.text && !cache.has(`${chatId}:${m.id}`));
    const batches = [];
    for (let i = 0; i < pending.length; i += BATCH) batches.push(pending.slice(i, i + BATCH));
    const results = await Promise.allSettled(batches.map((batch) => translateBatch(chatId, batch)));
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) log.warn(`[Telegram] translation failed for ${chatId}: ${failed.reason?.message || failed.reason}`);
    return messages.map((m) => {
      const t = cache.get(`${chatId}:${m.id}`);
      return t && t.from !== 'en' ? { ...m, translation: t } : m;
    });
  }

  return { translate, get size() { return cache.size; } };
}
