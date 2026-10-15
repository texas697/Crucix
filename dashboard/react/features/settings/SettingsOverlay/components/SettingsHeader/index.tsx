import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import type { UserProfile } from '../../../../../api/types';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';

export interface SettingsHeaderProps {
  me: UserProfile;
  titleId: string;
  onClose: () => void;
}

export function SettingsHeader({ me, titleId, onClose }: SettingsHeaderProps) {
  return (
    <Box className={CLASSES.head} sx={STYLES.head}>
      <Box className={CLASSES.headText}>
        <Box className={CLASSES.kicker} sx={STYLES.kicker}>Step 1 of 1 · Bring your own key</Box>
        <Box className={CLASSES.title} sx={STYLES.title} id={titleId}>Enter your LLM API key</Box>
        <Box className={CLASSES.sub} sx={STYLES.sub}>
          {`Signed in as ${me.email}. `}
          {me.byokEnabled
            ? 'Your key is encrypted at rest and only used for your requests.'
            : 'BYOK is disabled on this server (missing encryption key).'}
        </Box>
      </Box>
      <IconButton className={CLASSES.close} sx={STYLES.close} onClick={onClose} aria-label="Close settings">
        <CloseIcon className={CLASSES.closeIcon} fontSize="inherit" />
      </IconButton>
    </Box>
  );
}
