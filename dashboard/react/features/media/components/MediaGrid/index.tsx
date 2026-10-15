import Box from '@mui/material/Box';
import { GRID_CHANNELS } from '../../channels';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { GridCell } from '../GridCell';

export function MediaGrid() {
  return (
    <Box className={CLASSES.grid} sx={STYLES.grid} id="grid">
      {GRID_CHANNELS.map((c) => <GridCell key={c.id} channel={c} />)}
    </Box>
  );
}
