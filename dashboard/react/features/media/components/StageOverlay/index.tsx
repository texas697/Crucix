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
    <div className={clsx(CLASSES.overlay, CLASSES.overlayShow)} id="overlay" role={phase === 'error' ? 'alert' : 'status'}>
      {phase === 'loading' && (
        <>
          <div className={CLASSES.spinner} />
          <div className={CLASSES.overlayTitle}>Loading stream</div>
          <div className={CLASSES.overlaySub}>Connecting to {channelName}…</div>
        </>
      )}
      {phase === 'error' && (
        <>
          <div className={CLASSES.overlayTitle}>Feed unavailable</div>
          <div className={CLASSES.overlaySub}>{errorMsg}</div>
          <div className={CLASSES.overlayActions} style={STYLES.overlayActions}>
            {youTubeUrl && (
              <button type="button" className={clsx(CLASSES.button, CLASSES.buttonPrimary)} onClick={onPlayYouTube}>
                Play via YouTube
              </button>
            )}
            {openUrl && (
              <a className={CLASSES.button} href={openUrl} target="_blank" rel="noopener noreferrer">
                Open broadcaster page ↗
              </a>
            )}
            <button type="button" className={CLASSES.button} onClick={onRetry}>Retry</button>
          </div>
        </>
      )}
    </div>
  );
}
