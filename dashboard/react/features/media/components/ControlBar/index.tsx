import clsx from 'clsx';
import { CLASSES } from '../../classes';
import type { MediaControlsState } from '../../types';

export interface ControlBarProps {
  channelName: string;
  controls: MediaControlsState;
  isGridOn: boolean;
  openUrl: string | null;
  onToggleGrid: () => void;
}

export function ControlBar({ channelName, controls, isGridOn, openUrl, onToggleGrid }: ControlBarProps) {
  return (
    <div className={CLASSES.bar}>
      <span className={CLASSES.nowPlaying} id="nowName">{channelName}</span>
      <span className={CLASSES.live} id="liveBadge">
        <span className={CLASSES.liveDot} />LIVE
      </span>
      <span className={CLASSES.barSpacer} />
      <button
        type="button"
        className={clsx(CLASSES.control, controls.isMuted && CLASSES.controlOn)}
        id="btnMute"
        title="Mute (m)"
        aria-label="Mute"
        aria-pressed={controls.isMuted}
        onClick={controls.onToggleMute}
      >
        {controls.isMuted ? '🔇' : '🔊'}
      </button>
      <input
        className={CLASSES.volume}
        id="vol"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={controls.volume}
        title="Volume"
        aria-label="Volume"
        onChange={controls.onVolumeInput}
      />
      <button type="button" className={CLASSES.control} id="btnPip" title="Picture in picture" onClick={controls.onTogglePip}>▣</button>
      <button type="button" className={CLASSES.control} id="btnFs" title="Fullscreen (f)" onClick={controls.onToggleFullscreen}>⛶</button>
      <button
        type="button"
        className={clsx(CLASSES.control, isGridOn && CLASSES.controlOn)}
        id="btnGrid"
        title="Multi-channel grid"
        aria-pressed={isGridOn}
        onClick={onToggleGrid}
      >
        ⊞
      </button>
      {openUrl && (
        <a className={CLASSES.button} id="btnOpen" href={openUrl} target="_blank" rel="noopener noreferrer">
          Open feed ↗
        </a>
      )}
    </div>
  );
}
