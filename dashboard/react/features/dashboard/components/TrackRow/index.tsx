import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { str } from '../../coerce';
import { getAge } from '../../format';
import type { TrackItem } from '../../types';
import { STYLES, trackTypeSx } from './styles';

export interface TrackRowProps {
  track: TrackItem;
}

const TRACK_TYPE_COLOR: Record<string, string> = {
  fpv: '#f2c879', uav: '#f59a5e', missile: '#ff6b74', kab: '#b48cff', shahed: '#ff6b74',
};

export function TrackRow({ track: x }: TrackRowProps) {
  const type = str(x.type) || 'track';
  const col = TRACK_TYPE_COLOR[type.toLowerCase()] || '#ff9e6b';
  const typeSx = useMemo(() => trackTypeSx(col), [col]);
  const age = x.updatedAt ? getAge(x.updatedAt) : '';
  return (
    <Box className={CLASSES.trackRow} sx={STYLES.trackRow}>
      <Box component="span" className={CLASSES.trackType} sx={typeSx}>{type.toUpperCase()}</Box>
      <Box component="span" className={CLASSES.trackLocation} sx={STYLES.trackLocation}>
        {str(x.locality)}{x.locality && x.region ? ', ' : ''}{str(x.region)}
      </Box>
      <Box component="span" className={CLASSES.trackMeta} sx={STYLES.trackMeta}>{x.confidence || ''} {'·'} {x.sourceCount || 1} src {'·'} {age}</Box>
    </Box>
  );
}
