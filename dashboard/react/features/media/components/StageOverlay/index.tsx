import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { MediaPhase } from '../../types';

export interface StageOverlayProps {
  phase: MediaPhase;
  channelName: string;
  errorMsg: string;
  youTubeUrl: string | null;
  openUrl: string | null;
  onPlayYouTube: () => void;
  onRetry: () => void;
}

export function StageOverlay({ phase, channelName, errorMsg, youTubeUrl, openUrl, onPlayYouTube, onRetry }: StageOverlayProps) {
  return (
    <Box className={CLASSES.overlay} sx={STYLES.overlay} id="overlay" role={phase === 'error' ? 'alert' : 'status'}>
      {phase === 'loading' && (
        <>
          <Box className={CLASSES.spinner} sx={STYLES.spinner} />
          <Typography component="div" className={CLASSES.overlayTitle} sx={STYLES.overlayTitle}>Loading stream</Typography>
          <Typography component="div" className={CLASSES.overlaySub} sx={STYLES.overlaySub}>Connecting to {channelName}…</Typography>
        </>
      )}
      {phase === 'error' && (
        <>
          <Typography component="div" className={CLASSES.overlayTitle} sx={STYLES.overlayTitle}>Feed unavailable</Typography>
          <Typography component="div" className={CLASSES.overlaySub} sx={STYLES.overlaySub}>{errorMsg}</Typography>
          <Box className={CLASSES.overlayActions} sx={STYLES.overlayActions}>
            {youTubeUrl && (
              <Button
                variant="contained"
                className={clsx(CLASSES.button, CLASSES.buttonPrimary)}
                sx={[STYLES.button, STYLES.buttonPrimary]}
                onClick={onPlayYouTube}
              >
                Play via YouTube
              </Button>
            )}
            {openUrl && (
              <Button
                component="a"
                variant="outlined"
                className={CLASSES.button}
                sx={STYLES.button}
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open broadcaster page ↗
              </Button>
            )}
            <Button variant="outlined" className={CLASSES.button} sx={STYLES.button} onClick={onRetry}>Retry</Button>
          </Box>
        </>
      )}
    </Box>
  );
}
