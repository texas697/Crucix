import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import type { UserProfile } from '../../../../api/types';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';
import { accountName } from '../../utils';

export interface AccountControlsProps {
  me: UserProfile | null;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function AccountControls({ me, onOpenSettings, onLogout }: AccountControlsProps) {
  if (!me) return null;
  return (
    <>
      {me.llm
        ? (
          <Button variant="outlined" className={CLASSES.keyPill} sx={STYLES.control} onClick={onOpenSettings}>
            AI key
            <Box component="span" className={CLASSES.keyPillValue} sx={STYLES.keyPillValue}>
              {me.llm.provider.toUpperCase()}
            </Box>
          </Button>
        )
        : (
          <Button variant="contained" className={CLASSES.keyCta} sx={STYLES.keyCta} onClick={onOpenSettings}>
            ⚡ Add your AI key
          </Button>
        )}
      <IconButton className={CLASSES.settingsButton} sx={STYLES.iconControl} onClick={onOpenSettings} aria-label="Settings">
        <SettingsIcon className={CLASSES.settingsIcon} fontSize="small" />
      </IconButton>
      <Button variant="text" className={CLASSES.userChip} sx={STYLES.userChip} onClick={onLogout}>
        {accountName(me)}
        <Box component="span" className={CLASSES.userChipExit} sx={STYLES.userChipExit}>EXIT</Box>
      </Button>
    </>
  );
}
