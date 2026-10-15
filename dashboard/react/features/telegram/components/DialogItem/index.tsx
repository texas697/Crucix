import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { useAvatar } from '../../hooks/useAvatar';
import { STYLES } from '../../styles';
import type { TelegramDialog } from '../../types';

export interface DialogItemProps {
  dialog: TelegramDialog;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DialogItem({ dialog, isSelected, onSelect }: DialogItemProps) {
  const { avatarSrc, onAvatarError } = useAvatar(dialog);

  return (
    <Box
      className={clsx(CLASSES.dialogItem, isSelected && CLASSES.dialogActive)}
      sx={STYLES.dialogItem}
      onClick={() => onSelect(dialog.id)}
      role="button"
      tabIndex={0}
    >
      {avatarSrc && (
        <Avatar className={CLASSES.dialogAvatar} sx={STYLES.dialogAvatar} src={avatarSrc} alt="" imgProps={{ onError: onAvatarError, loading: 'lazy' }} />
      )}
      <Box className={CLASSES.dialogInfo} sx={STYLES.dialogInfo}>
        <Box sx={STYLES.dialogTitleRow}>
          <Typography className={CLASSES.dialogTitle} sx={STYLES.dialogTitle}>
            {dialog.title}
          </Typography>
          {dialog.unreadCount > 0 && (
            <Chip size="small" color="primary" className={CLASSES.dialogUnread} sx={STYLES.dialogUnread} label={dialog.unreadCount > 99 ? '99+' : dialog.unreadCount} />
          )}
          <Typography className={CLASSES.dialogMeta} sx={STYLES.dialogMeta}>
            {formatTime(dialog.lastMessage?.date || dialog.date)}
          </Typography>
        </Box>
        <Typography className={CLASSES.dialogSnippet} sx={STYLES.dialogSnippet}>
          {dialog.lastMessage?.text || 'No messages'}
        </Typography>
      </Box>
    </Box>
  );
}
