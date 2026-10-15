import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { TelegramMessage } from '../../types';

export interface MessageBubbleProps {
  message: TelegramMessage;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOut = message.out;

  return (
    <Box
      className={clsx(
        CLASSES.messageBubble,
        isOut ? CLASSES.messageBubbleOut : CLASSES.messageBubbleIn,
        isOut ? 'out' : 'in',
      )}
      sx={STYLES.messageBubble}
    >
      {message.mediaType && (
        <Typography className={CLASSES.messageMedia} sx={STYLES.messageMedia}>
          [{message.mediaType}]
        </Typography>
      )}
      <Typography className={CLASSES.messageText}>
        {message.text}
      </Typography>
      <Typography className={CLASSES.messageTime} sx={STYLES.messageTime}>
        {formatTime(message.date)}
      </Typography>
    </Box>
  );
}
