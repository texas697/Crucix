import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export function MediaFoot() {
  return (
    <Box className={CLASSES.foot} sx={STYLES.foot}>
      Live streams are provided by the broadcasters and may be geo-restricted or intermittent.
      If a feed does not play, use “Open feed” or pick another channel. Keyboard: ←/→ change
      channel, m mute, f fullscreen.
    </Box>
  );
}
