import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { STYLES } from './styles';

export function DigestEmpty() {
  return (
    <Box className={CLASSES.empty} sx={STYLES.empty}>
      {'NOTHING HERE YET.\n\nThe library fills as the digest ingests feeds (every 30 minutes). Try ALL, or come back shortly.'}
    </Box>
  );
}
