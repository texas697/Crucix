import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';

export interface StatusClusterProps {
  sourcesOk: number;
  sourcesQueried: number;
  modelLabel: string;
  ageLabel: string;
  timestamp?: string | null;
}

export function StatusCluster({ sourcesOk, sourcesQueried, modelLabel, ageLabel, timestamp }: StatusClusterProps) {
  return (
    <Stack direction="row" className={CLASSES.status} sx={STYLES.status}>
      <Box component="span" className={CLASSES.statusLive} sx={[STYLES.segment, STYLES.live]}>
        <Box component="span" className={CLASSES.statusDot} sx={STYLES.dot} aria-hidden="true" />
        Live
      </Box>
      <Box component="span" className={CLASSES.statusSources} sx={STYLES.segment}>
        <Box component="b" className={CLASSES.statusSourcesOk} sx={STYLES.sourcesOk}>{sourcesOk}</Box>
        <Box component="span" className={CLASSES.statusSlash} sx={STYLES.slash}>/</Box>
        {sourcesQueried}
      </Box>
      <Box component="span" className={CLASSES.statusModel} sx={[STYLES.segment, STYLES.model]}>{modelLabel}</Box>
      <Box component="span" className={CLASSES.statusAge} sx={[STYLES.segment, STYLES.age]} title={timestamp || undefined}>
        {ageLabel}
      </Box>
    </Stack>
  );
}
