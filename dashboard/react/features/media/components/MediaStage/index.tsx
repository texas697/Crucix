import type { RefObject } from 'react';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { MediaPlayerState } from '../../types';
import { StageOverlay } from '../StageOverlay';

export interface MediaStageProps {
  stageRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  player: MediaPlayerState;
  channelName: string;
  youTubeUrl: string | null;
  openUrl: string | null;
}

export function MediaStage({ stageRef, videoRef, player, channelName, youTubeUrl, openUrl }: MediaStageProps) {
  const showOverlay = player.youTubeSrc === null && player.phase !== 'ready';
  return (
    <div className={CLASSES.stage} id="stage" ref={stageRef}>
      <video
        id="player"
        className={CLASSES.video}
        ref={videoRef}
        playsInline
        style={player.youTubeSrc ? STYLES.videoHidden : STYLES.videoShown}
      />
      {player.youTubeSrc && (
        <iframe
          className={CLASSES.frame}
          title={channelName}
          src={player.youTubeSrc}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
      {showOverlay && (
        <StageOverlay
          phase={player.phase}
          channelName={channelName}
          errorMsg={player.errorMsg}
          youTubeUrl={youTubeUrl}
          openUrl={openUrl}
          onPlayYouTube={player.onPlayYouTube}
          onRetry={player.onRetry}
        />
      )}
    </div>
  );
}
