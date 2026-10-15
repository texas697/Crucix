import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export function SnapshotMapLoading() {
  return (
    <Box className={CLASSES.mapLoading} sx={STYLES.mapLoading} id="mapLoading">
      <Box component="span" className={CLASSES.mapLoadingText} sx={STYLES.mapLoadingText} id="mapLoadingText">Initializing map</Box>
    </Box>
  );
}
