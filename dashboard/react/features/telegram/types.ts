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
}

export interface TelegramMessage {
  id: number;
  text: string;
  date: string | null;
  senderId: string | null;
  out: boolean;
  mediaType: string | null;
  replyToMsgId: number | null;
}

export interface TelegramStatus {
  configured: boolean;
  authenticated: boolean;
  connected: boolean;
  message?: string;
  error?: string;
}
