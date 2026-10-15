import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { formatBytes, mediaUrl } from '../../mediaUrl';
import { STYLES } from '../../styles';
import type { TelegramMedia } from '../../types';

export interface MessageMediaProps {
  chatId: string;
  messageId: number;
  media: TelegramMedia;
}

export function MessageMedia({ chatId, messageId, media }: MessageMediaProps) {
  if (media.kind === 'photo') {
    return (
      <Box className={CLASSES.media} sx={STYLES.media}>
        <a href={mediaUrl(chatId, messageId, 'full')} target="_blank" rel="noopener noreferrer">
          <Box component="img" className={CLASSES.mediaPhoto} sx={STYLES.mediaPhoto} src={mediaUrl(chatId, messageId, 'photo')} alt="" loading="lazy" />
        </a>
      </Box>
    );
  }
  if (media.kind === 'video' && !media.tooLarge) {
    return (
      <Box className={CLASSES.media} sx={STYLES.media}>
        <Box component="video" className={CLASSES.mediaVideo} sx={STYLES.mediaVideo} controls preload="none" playsInline poster={mediaUrl(chatId, messageId, 'thumb')} src={mediaUrl(chatId, messageId, 'file')} />
      </Box>
    );
  }
  if (media.kind === 'audio' && !media.tooLarge) {
    return (
      <Box className={CLASSES.media} sx={STYLES.media}>
        <Box component="audio" className={CLASSES.mediaAudio} sx={STYLES.mediaAudio} controls preload="none" src={mediaUrl(chatId, messageId, 'file')} />
      </Box>
    );
  }
  const label = media.tooLarge ? `${media.kind} too large to stream (${formatBytes(media.size)})` : `${media.kind} ${formatBytes(media.size)}`.trim();
  return (
    <Box className={CLASSES.media} sx={STYLES.media}>
      {media.kind === 'video' && <Box component="img" className={CLASSES.mediaPhoto} sx={STYLES.mediaPhoto} src={mediaUrl(chatId, messageId, 'thumb')} alt="" loading="lazy" />}
      <Typography className={CLASSES.mediaNote} sx={STYLES.mediaNote}>[{label}]</Typography>
    </Box>
  );
}
