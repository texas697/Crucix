import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { toEntity } from './format.mjs';

export const MAX_FILE_BYTES = 60 * 1024 * 1024;
export const MEDIA_KINDS = ['photo', 'full', 'thumb', 'file', 'webpage'];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a' };

function photoIndex(photo, large) {
  const sizes = photo?.sizes || [];
  if (!sizes.length) return undefined;
  if (large) return sizes.length - 1;
  const idx = sizes.findIndex((s) => s.type === 'x');
  return idx >= 0 ? idx : sizes.length - 1;
}

function pick(message, kind) {
  const media = message?.media;
  if (!media) return null;
  if (kind === 'webpage' && media.webpage?.photo) return { target: media.webpage.photo, thumb: photoIndex(media.webpage.photo, false), mime: 'image/jpeg' };
  if ((kind === 'photo' || kind === 'full') && media.photo) return { target: message, thumb: photoIndex(media.photo, kind === 'full'), mime: 'image/jpeg' };
  const doc = media.document;
  if (!doc) return null;
  if (kind === 'thumb') return doc.thumbs?.length ? { target: message, thumb: doc.thumbs.length - 1, mime: 'image/jpeg' } : null;
  if (kind === 'file') return Number(doc.size) <= MAX_FILE_BYTES ? { target: message, mime: doc.mimeType || 'application/octet-stream' } : null;
  return null;
}

export function createMediaStore({ runsDir, getClient }) {
  const dir = resolve(runsDir, 'telegram-media');
  mkdirSync(dir, { recursive: true });
  const inflight = new Map();

  async function download(chatId, msgId, kind) {
    const client = await getClient();
    const [message] = await client.getMessages(toEntity(chatId), { ids: [msgId] });
    const choice = pick(message, kind);
    if (!choice) return null;
    const path = join(dir, `${chatId}_${msgId}_${kind}.${EXT[choice.mime] || 'bin'}`);
    if (!existsSync(path)) {
      const out = await client.downloadMedia(choice.target, { outputFile: path, thumb: choice.thumb });
      if (!out) return null;
    }
    return { path, mime: choice.mime };
  }

  async function fetch(chatId, msgId, kind) {
    const key = `${chatId}:${msgId}:${kind}`;
    if (!inflight.has(key)) inflight.set(key, download(chatId, msgId, kind).finally(() => inflight.delete(key)));
    return inflight.get(key);
  }

  return { fetch, dir };
}
