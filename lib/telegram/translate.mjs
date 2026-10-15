import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SYSTEM = [
  'You translate Telegram posts into natural English for an intelligence dashboard.',
  'Input is a JSON array of {id, text}. Reply with ONLY a JSON array of {id, from, text}:',
  'from = ISO 639-1 code of the source language, text = faithful English translation keeping line breaks,',
  'handles, hashtags and URLs unchanged. If a post is already English, return it unchanged with from="en".',
].join(' ');

const BATCH = 5;
const MAX_PER_CHAT = 5000;

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

export function createTranslator({ provider, runsDir = null, log = console }) {
  const dir = runsDir ? resolve(runsDir, 'telegram-translations') : null;
  if (dir) mkdirSync(dir, { recursive: true });
  const chats = new Map();

  function load(chatId) {
    if (chats.has(chatId)) return chats.get(chatId);
    let entries = {};
    const file = dir ? join(dir, `${chatId}.json`) : null;
    if (file && existsSync(file)) {
      try { entries = JSON.parse(readFileSync(file, 'utf8')) || {}; } catch { entries = {}; }
    }
    const store = { file, entries };
    chats.set(chatId, store);
    return store;
  }

  function persist(store) {
    if (!store.file) return;
    const ids = Object.keys(store.entries).map(Number).sort((a, b) => b - a);
    for (const id of ids.slice(MAX_PER_CHAT)) delete store.entries[id];
    writeFileSync(store.file, JSON.stringify(store.entries));
  }

  async function translateBatch(store, items) {
    const user = JSON.stringify(items.map((m) => ({ id: m.id, text: m.text })));
    const r = await provider.complete(SYSTEM, user, { maxTokens: 6000, timeout: 110000 });
    for (const row of parseArray(r.text)) {
      if (row && row.id != null && typeof row.text === 'string') {
        store.entries[row.id] = { text: row.text, from: String(row.from || '').toLowerCase() || null };
      }
    }
    persist(store);
  }

  async function translate(chatId, messages) {
    if (!provider?.isConfigured) return messages;
    const store = load(chatId);
    const pending = messages.filter((m) => m.text && !store.entries[m.id]);
    const batches = [];
    for (let i = 0; i < pending.length; i += BATCH) batches.push(pending.slice(i, i + BATCH));
    const results = await Promise.allSettled(batches.map((batch) => translateBatch(store, batch)));
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) log.warn(`[Telegram] translation failed for ${chatId}: ${failed.reason?.message || failed.reason}`);
    return messages.map((m) => {
      const t = store.entries[m.id];
      return t && t.from !== 'en' ? { ...m, translation: t } : m;
    });
  }

  return { translate, cached: (chatId) => Object.keys(load(chatId).entries).length };
}
