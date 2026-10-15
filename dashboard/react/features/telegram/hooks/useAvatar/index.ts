import { useCallback, useState } from 'react';
import { avatarUrl } from '../../mediaUrl';
import type { TelegramDialog } from '../../types';

export function useAvatar(dialog: TelegramDialog) {
  const [isBroken, setIsBroken] = useState(false);
  const onAvatarError = useCallback(() => setIsBroken(true), []);
  const src = dialog.hasPhoto && !isBroken ? avatarUrl(dialog.id) : null;
  return { avatarSrc: src, onAvatarError };
}
