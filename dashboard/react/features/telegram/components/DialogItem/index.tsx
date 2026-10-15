import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { TelegramDialog } from '../../types';

export interface DialogItemProps {
  dialog: TelegramDialog;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DialogItem({ dialog, isSelected, onSelect }: DialogItemProps) {
  const initials = dialog.title ? dialog.title.slice(0, 2).toUpperCase() : 'TG';

  return (
    <Box
      className={clsx(CLASSES.dialogItem, isSelected && CLASSES.dialogActive)}
      sx={STYLES.dialogItem}
      onClick={() => onSelect(dialog.id)}
      role="button"
      tabIndex={0}
    >
      <Badge
        badgeContent={dialog.unreadCount}
        color="primary"
        max={99}
        className={CLASSES.badge}
      >
        <Avatar className={CLASSES.dialogAvatar} sx={STYLES.dialogAvatar}>
          {initials}
        </Avatar>
      </Badge>
      <Box className={CLASSES.dialogInfo} sx={STYLES.dialogInfo}>
        <Box sx={STYLES.dialogTitleRow}>
          <Typography className={CLASSES.dialogTitle} sx={STYLES.dialogTitle}>
            {dialog.title}
          </Typography>
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
