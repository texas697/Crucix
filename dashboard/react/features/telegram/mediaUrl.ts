export type MediaFileKind = 'photo' | 'full' | 'thumb' | 'file' | 'webpage';

export function mediaUrl(chatId: string, messageId: number, kind: MediaFileKind): string {
  return `/api/telegram/media/${encodeURIComponent(chatId)}/${messageId}?kind=${kind}`;
}

export function formatBytes(size: number | null): string {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function avatarUrl(chatId: string): string {
  return `/api/telegram/avatar/${encodeURIComponent(chatId)}`;
}
