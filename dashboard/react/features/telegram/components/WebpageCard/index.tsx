import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { mediaUrl } from '../../mediaUrl';
import type { TelegramWebpage } from '../../types';

export interface WebpageCardProps {
  webpage: TelegramWebpage;
  chatId: string;
  messageId: number;
}

export function WebpageCard({ webpage, chatId, messageId }: WebpageCardProps) {
  return (
    <Box component="a" href={webpage.url} target="_blank" rel="noopener noreferrer" className={CLASSES.webpage} sx={STYLES.webpage}>
      {webpage.hasPhoto && (
        <Box component="img" className={CLASSES.webpageImage} sx={STYLES.webpageImage} src={mediaUrl(chatId, messageId, 'webpage')} alt="" loading="lazy" />
      )}
      {webpage.siteName && (
        <Typography className={CLASSES.webpageSite} sx={STYLES.webpageSite}>
          {webpage.siteName}
        </Typography>
      )}
      <Typography className={CLASSES.webpageTitle} sx={STYLES.webpageTitle}>
        {webpage.title || webpage.displayUrl}
      </Typography>
      {webpage.description && (
        <Typography className={CLASSES.webpageDescription} sx={STYLES.webpageDescription}>
          {webpage.description}
        </Typography>
      )}
      <Typography className={CLASSES.webpageUrl} sx={STYLES.webpageUrl}>
        {webpage.displayUrl}
      </Typography>
    </Box>
  );
}
