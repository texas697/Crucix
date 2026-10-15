import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { TelegramStatus } from '../../types';

export interface TelegramHeroProps {
  status: TelegramStatus | null;
}

export function TelegramHero({ status }: TelegramHeroProps) {
  const isConnected = status?.connected === true;

  return (
    <Box className={CLASSES.hero} sx={STYLES.hero}>
      <Box>
        <Typography variant="h4" className={CLASSES.heroTitle}>
          Telegram Monitor
        </Typography>
        <Typography className={CLASSES.heroLead} sx={STYLES.heroLead}>
          Read-only feed of selected Telegram channels and chats.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {isConnected ? (
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label="Connected"
          />
        ) : (
          <Chip
            size="small"
            color="default"
            variant="outlined"
            label="Disconnected"
          />
        )}
      </Box>
    </Box>
  );
}
