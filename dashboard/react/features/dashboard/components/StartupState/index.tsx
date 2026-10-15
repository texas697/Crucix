import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import clsx from 'clsx';
import type { HealthResponse } from '../../../../api/types';
import { CLASSES } from '../../classes';
import { STYLES } from './styles';

export interface StartupStateProps {
  health: HealthResponse | null;
  now?: () => number;
}

function startupLines(health: HealthResponse | null, nowMs: number): string[] {
  const startedAt = health?.sweepStartedAt ? new Date(health.sweepStartedAt).getTime() : null;
  const elapsed = startedAt ? Math.max(0, Math.round((nowMs - startedAt) / 1000)) : null;
  return [
    'INITIALIZING CRUCIX ENGINE',
    'CONNECTING TO SOURCE GRID',
    health?.sweepInProgress ? `SWEEP IN PROGRESS${elapsed !== null ? ` · ${elapsed}s` : ''}` : 'AWAITING FIRST SWEEP',
    health?.lastSweep ? 'DATA INBOUND' : 'NO DATA YET',
    'This page updates itself; you do not need to refresh.',
  ];
}

export function StartupState({ health, now = Date.now }: StartupStateProps) {
  const lines = startupLines(health, now());
  return (
    <Box id="boot" className={CLASSES.boot} sx={STYLES.boot}>
      <Box className={CLASSES.bootLogo} sx={STYLES.bootLogo}>
        <Box
          component="img"
          className={clsx(CLASSES.bootLogoImg, CLASSES.bootLogoDark)}
          sx={[STYLES.bootLogoImg, STYLES.bootLogoDark]}
          src="/brand/mfb-loading-dark-transparent.png"
          alt="MFB Services Intelligence"
          width={1744}
          height={892}
        />
        <Box
          component="img"
          className={clsx(CLASSES.bootLogoImg, CLASSES.bootLogoLight)}
          sx={[STYLES.bootLogoImg, STYLES.bootLogoLight]}
          src="/brand/mfb-loading-light-transparent.png"
          alt=""
          aria-hidden="true"
          width={1744}
          height={892}
        />
      </Box>
      <Box id="bootLines" className={CLASSES.bootLines} sx={STYLES.bootLines} role="status" aria-live="polite">
        {lines.map((line) => <Box key={line} className={CLASSES.bootLine}>{line}</Box>)}
      </Box>
      <LinearProgress className={CLASSES.bootProgress} sx={STYLES.bootProgress} aria-hidden="true" />
      <Box id="bootFinal" className={CLASSES.bootFinal} sx={STYLES.bootFinal}>
        {health?.sweepInProgress ? 'SWEEPING' : 'AWAITING FIRST SWEEP'}
      </Box>
    </Box>
  );
}
