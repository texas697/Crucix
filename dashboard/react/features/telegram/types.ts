export type DialogType = 'channel' | 'group' | 'user' | 'chat';

export interface TelegramLastMessage {
  id: number;
  text: string;
  date: string | null;
}

export interface TelegramDialog {
  id: string;
  title: string;
  unreadCount: number;
  type: DialogType;
  date: string | null;
  lastMessage: TelegramLastMessage | null;
  group?: string | null;
  hasPhoto?: boolean;
}

export interface TelegramTranslation {
  text: string;
  from: string | null;
}

export interface TelegramWebpage {
  url: string;
  displayUrl: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  hasPhoto: boolean;
}

export type MediaKind = 'photo' | 'video' | 'audio' | 'document';

export interface TelegramMedia {
  kind: MediaKind;
  mime: string;
  width: number | null;
  height: number | null;
  size: number | null;
  duration: number | null;
  tooLarge: boolean;
}

export interface TelegramMessage {
  id: number;
  text: string;
  date: string | null;
  senderId: string | null;
  out: boolean;
  mediaType: string | null;
  replyToMsgId: number | null;
  translation?: TelegramTranslation;
  webpage?: TelegramWebpage | null;
  media?: TelegramMedia | null;
}

export interface TelegramStatus {
  configured: boolean;
  authenticated: boolean;
  connected: boolean;
  message?: string;
  error?: string;
}
