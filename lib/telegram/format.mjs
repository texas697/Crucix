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
  return {
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

export function formatMessage(m) {
  return {
    id: m.id,
    text: m.message || '',
    date: isoDate(m.date),
    senderId: m.senderId ? String(m.senderId) : null,
    out: Boolean(m.out),
    mediaType: resolveMediaType(m.media),
    replyToMsgId: m.replyTo ? m.replyTo.replyToMsgId : null,
  };
}

export function maskPhone(phone) {
  if (!phone) return '';
  return `+${phone.slice(-4).padStart(phone.length, '*')}`;
}

export function toEntity(chatId) {
  try {
    return BigInt(chatId);
  } catch {
    return chatId;
  }
}
