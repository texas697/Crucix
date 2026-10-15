import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export function MapLoading() {
  return (
    <Box className={CLASSES.loading} id="mapLoading" sx={STYLES.loading}>
      <Box className={CLASSES.loadingCard} sx={STYLES.loadingCard}>
        <Box className={CLASSES.loadingRing} sx={STYLES.loadingRing} />
        <Box component="span" className={CLASSES.loadingText} id="mapLoadingText" sx={STYLES.loadingText}>Initializing map</Box>
      </Box>
    </Box>
  );
}
