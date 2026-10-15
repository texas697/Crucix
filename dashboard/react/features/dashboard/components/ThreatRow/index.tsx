import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import type { ThreatRegion } from '../ThreatPanel/threat';
import { STYLES, threatDotSx, threatLevelSx } from './styles';

export interface ThreatRowProps {
  threat: ThreatRegion;
}

export function ThreatRow({ threat: x }: ThreatRowProps) {
  const nd = x.parts.reduce((s, p) => s + p.n, 0);
  const dotSx = useMemo(() => threatDotSx(x.color), [x.color]);
  const levelSx = useMemo(() => threatLevelSx(x.color), [x.color]);
  return (
    <Box className={CLASSES.threatRow} sx={STYLES.threatRow} title={`${x.tip} ${'·'} hover for the breakdown`}>
      <Box component="span" className={CLASSES.threatDot} sx={dotSx} />
      <Box component="span" className={CLASSES.threatName} sx={STYLES.threatName}>{x.label}</Box>
      <Box component="span" className={CLASSES.threatMeta} sx={STYLES.threatMeta}>
        {x.severe.toLocaleString()} severe
        {nd ? (
          <Box component="span" className={CLASSES.threatDisruption} sx={STYLES.threatDisruption} title={`${nd} disruption signal${nd === 1 ? '' : 's'}`}>
            {'⚠'} {nd}
          </Box>
        ) : null}
      </Box>
      <Box component="span" className={CLASSES.threatLevel} sx={levelSx}>
        {x.level} <Box component="span" className={CLASSES.threatScore} sx={STYLES.threatScore}>{x.score}</Box>
      </Box>
    </Box>
  );
}
