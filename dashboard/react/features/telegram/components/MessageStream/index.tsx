import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { TelegramDialog, TelegramMessage } from '../../types';
import { MessageBubble } from '../MessageBubble';

export interface MessageStreamProps {
  activeDialog: TelegramDialog | null;
  messages: TelegramMessage[];
  isLoadingMessages: boolean;
}

export function MessageStream({ activeDialog, messages, isLoadingMessages }: MessageStreamProps) {
  if (!activeDialog) {
    return (
      <Box className={CLASSES.stream} sx={STYLES.stream}>
        <Box sx={STYLES.emptyState}>
          <Typography variant="body1">Select a chat or channel to view messages</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={CLASSES.stream} sx={STYLES.stream}>
      <Box className={CLASSES.streamHeader} sx={STYLES.streamHeader}>
        <Box>
          <Typography variant="h6" className={CLASSES.streamHeaderTitle} sx={STYLES.streamHeaderTitle}>
            {activeDialog.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
            {activeDialog.type}
          </Typography>
        </Box>
        <Chip
          label="Read-only stream"
          size="small"
          variant="outlined"
          color="info"
          className={CLASSES.streamHeaderBadge}
        />
      </Box>
      <Box className={CLASSES.streamMessages} sx={STYLES.streamMessages}>
        {isLoadingMessages ? (
          <Box sx={STYLES.emptyState}>
            <CircularProgress size={28} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={STYLES.emptyState}>
            <Typography variant="body2">No messages available</Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </Box>
    </Box>
  );
}
