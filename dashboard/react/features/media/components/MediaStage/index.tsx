import type { RefObject } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
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
  const isYouTube = player.youTubeSrc !== null;
  const showOverlay = !isYouTube && player.phase !== 'ready';
  return (
    <Paper className={CLASSES.stage} sx={STYLES.stage} id="stage" ref={stageRef}>
      <Box
        component="video"
        id="player"
        className={CLASSES.video}
        sx={[STYLES.video, isYouTube && STYLES.videoHidden]}
        ref={videoRef}
        playsInline
      />
      {player.youTubeSrc && (
        <Box
          component="iframe"
          className={CLASSES.frame}
          sx={STYLES.frame}
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
    </Paper>
  );
}
