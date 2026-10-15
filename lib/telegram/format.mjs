function isoDate(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function dialogType(d) {
  if (d.isChannel) return 'channel';
  if (d.isGroup) return 'group';
  if (d.isUser) return 'user';
  return 'chat';
}

export function formatDialog(d) {
  const photo = d.entity?.photo;
  return {
    hasPhoto: Boolean(photo) && photo.className !== 'ChatPhotoEmpty' && photo.className !== 'UserProfilePhotoEmpty',
    id: String(d.id),
    title: d.title || d.name || 'Untitled',
    unreadCount: d.unreadCount || 0,
    type: dialogType(d),
    date: isoDate(d.date),
    lastMessage: d.message
      ? { id: d.message.id, text: d.message.message || '', date: isoDate(d.message.date) }
      : null,
  };
}

export function resolveMediaType(media) {
  if (!media) return null;
  const className = media.className || media.constructor?.name || '';
  if (className.includes('Photo')) return 'photo';
  if (className.includes('Document')) {
    const mime = media.document?.mimeType || '';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  }
  if (className.includes('WebPage')) return 'webpage';
  if (className.includes('Poll')) return 'poll';
  return 'media';
}

function attr(doc, name) {
  return (doc.attributes || []).find((a) => (a.className || '') === name) || null;
}

export function describeMedia(media) {
  if (!media) return null;
  if (media.photo) {
    const best = [...(media.photo.sizes || [])].reverse().find((s) => s.w && s.h) || {};
    return { kind: 'photo', mime: 'image/jpeg', width: best.w || null, height: best.h || null, size: null, duration: null, tooLarge: false };
  }
  const doc = media.document;
  if (!doc) return null;
  const mime = doc.mimeType || 'application/octet-stream';
  const kind = mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'document';
  const video = attr(doc, 'DocumentAttributeVideo');
  const size = Number(doc.size) || null;
  return { kind, mime, width: video?.w || null, height: video?.h || null, size, duration: video?.duration ?? null, tooLarge: size != null && size > 60 * 1024 * 1024 };
}

export function webpageOf(media) {
  const w = media && media.webpage;
  if (!w || !w.url) return null;
  return {
    url: w.url,
    displayUrl: w.displayUrl || w.url,
    siteName: w.siteName || null,
    title: w.title || null,
    description: w.description || null,
    hasPhoto: Boolean(w.photo),
  };
}

export function formatMessage(m) {
  return {
    id: m.id,
    text: m.message || '',
    date: isoDate(m.date),
    senderId: m.senderId ? String(m.senderId) : null,
    out: Boolean(m.out),
    mediaType: resolveMediaType(m.media),
    replyToMsgId: m.replyTo ? m.replyTo.replyToMsgId : null,
    webpage: webpageOf(m.media),
    media: describeMedia(m.media),
  };
}

export function toEntity(chatId) {
  try {
    return BigInt(chatId);
  } catch {
    return chatId;
  }
}
