import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { useGridCell } from '../../hooks/useGridCell';
import { STYLES } from '../../styles';
import type { MediaChannel } from '../../types';

export interface GridCellProps {
  channel: MediaChannel;
}

export function GridCell({ channel }: GridCellProps) {
  const videoRef = useGridCell({ channel });
  return (
    <Box className={CLASSES.cell} sx={STYLES.cell}>
      <Box component="video" className={CLASSES.cellVideo} sx={STYLES.cellVideo} ref={videoRef} data-src={channel.hls} muted playsInline />
      <Typography component="span" className={CLASSES.cellCaption} sx={STYLES.cellCaption}>{channel.name}</Typography>
    </Box>
  );
}
