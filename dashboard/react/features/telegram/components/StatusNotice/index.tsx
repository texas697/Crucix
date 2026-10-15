import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { TelegramStatus } from '../../types';

export interface StatusNoticeProps {
  status: TelegramStatus | null;
}

export function StatusNotice({ status }: StatusNoticeProps) {
  if (!status || status.connected) return null;

  return (
    <Box className={CLASSES.statusNotice} sx={STYLES.statusNotice}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Telegram MTProto Setup Required
        </Typography>
        <Typography className={CLASSES.statusNoticeText} sx={STYLES.statusNoticeText}>
          {status.message || status.error || 'Authenticate your personal account to view your subscribed chats.'}
        </Typography>
      </Box>
      <Box>
        <Typography component="code" className={CLASSES.statusNoticeCode} sx={STYLES.statusNoticeCode}>
          npm run telegram:auth
        </Typography>
      </Box>
    </Box>
  );
}
