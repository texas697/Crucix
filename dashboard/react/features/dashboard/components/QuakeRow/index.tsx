import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asText, num, type Rec } from '../../coerce';
import { magColor } from '../../format';
import { ROW_STYLES, TONE_STYLES } from '../../styles';
import { quakeMagSx } from '../../stylesRows';

export interface QuakeRowProps {
  quake: Rec;
}

export function QuakeRow({ quake }: QuakeRowProps) {
  const magSx = useMemo(() => quakeMagSx(magColor(num(quake.mag))), [quake.mag]);
  const depth = quake.depth;
  return (
    <Box component="a" className={CLASSES.quakeRow} sx={ROW_STYLES.quakeRow} href={asText(quake.url) || '#'} target="_blank" rel="noopener">
      <Box component="span" className={CLASSES.quakeMag} sx={magSx}>
        {num(quake.mag).toFixed(1)}
      </Box>
      <Box component="span" className={CLASSES.quakePlace} sx={ROW_STYLES.quakePlace}>{asText(quake.place)}</Box>
      <Box component="span" className={CLASSES.quakeMeta} sx={ROW_STYLES.quakeMeta}>
        {depth != null ? `${Math.round(num(depth))} km` : ''}
        {quake.tsunami ? <Box component="span" className={CLASSES.quakeTsunami} sx={TONE_STYLES.orange}> tsunami</Box> : null}
      </Box>
    </Box>
  );
}
