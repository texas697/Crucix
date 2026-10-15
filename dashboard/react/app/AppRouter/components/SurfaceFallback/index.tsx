import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';

export function SurfaceFallback() {
  return (
    <Box className={CLASSES.surfaceFallback} sx={STYLES.surfaceFallback} aria-busy="true">
      <LinearProgress className={CLASSES.surfaceProgress} />
    </Box>
  );
}
