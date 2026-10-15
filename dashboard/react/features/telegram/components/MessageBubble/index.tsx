import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { useOriginalToggle } from '../../hooks/useOriginalToggle';
import { MessageMedia } from '../MessageMedia';
import { MessageText } from '../MessageText';
import { WebpageCard } from '../WebpageCard';
import { STYLES } from '../../styles';
import type { TelegramMessage } from '../../types';

export interface MessageBubbleProps {
  message: TelegramMessage;
  chatId: string;
}

const LANGUAGE_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function languageLabel(code: string | null): string {
  if (!code) return 'translated';
  try {
    return `translated from ${LANGUAGE_NAMES.of(code) ?? code}`;
  } catch {
    return `translated from ${code}`;
  }
}

export function MessageBubble({ message, chatId }: MessageBubbleProps) {
  const isOut = message.out;
  const translation = message.translation ?? null;
  const webpage = message.webpage ?? null;
  const media = message.media ?? null;
  const hideUrl = webpage && message.text.trim() === webpage.url ? webpage.url : null;
  const { isOriginalShown, onToggleOriginal } = useOriginalToggle();

  return (
    <Box
      className={clsx(CLASSES.messageBubble, isOut ? CLASSES.messageBubbleOut : CLASSES.messageBubbleIn, isOut ? 'out' : 'in')}
      sx={STYLES.messageBubble}
    >
      {media && <MessageMedia chatId={chatId} messageId={message.id} media={media} />}
      {!media && message.mediaType && message.mediaType !== 'webpage' && (
        <Typography className={CLASSES.messageMedia} sx={STYLES.messageMedia}>
          [{message.mediaType}]
        </Typography>
      )}
      <MessageText text={translation ? translation.text : message.text} className={clsx(CLASSES.messageText, translation && CLASSES.messageTranslated)} hideUrl={hideUrl} />
      {webpage && <WebpageCard webpage={webpage} chatId={chatId} messageId={message.id} />}
      {translation && (
        <Box component="button" type="button" className={CLASSES.messageToggle} sx={STYLES.messageToggle} onClick={onToggleOriginal}>
          {languageLabel(translation.from)} · {isOriginalShown ? 'hide original' : 'show original'}
        </Box>
      )}
      {translation && isOriginalShown && (
        <Typography className={CLASSES.messageOriginal} sx={STYLES.messageOriginal} dir="auto">
          {message.text}
        </Typography>
      )}
      <Typography className={CLASSES.messageTime} sx={STYLES.messageTime}>
        {formatTime(message.date)}
      </Typography>
    </Box>
  );
}
