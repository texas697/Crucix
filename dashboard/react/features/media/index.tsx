import { useMemo } from 'react';
import { safeExternalUrl } from '../../shared/safeUrl';
import { CHANNEL_COUNT, channelAt } from './channels';
import { CLASSES } from './classes';
import { ChannelList } from './components/ChannelList';
import { ControlBar } from './components/ControlBar';
import { MediaFoot } from './components/MediaFoot';
import { MediaGrid } from './components/MediaGrid';
import { MediaHero } from './components/MediaHero';
import { MediaLegacyStyles } from './components/MediaLegacyStyles';
import { MediaStage } from './components/MediaStage';
import { useMediaControls } from './hooks/useMediaControls';
import { useMediaKeys } from './hooks/useMediaKeys';
import { useMediaPlayer } from './hooks/useMediaPlayer';
import { useMediaRoute } from './hooks/useMediaRoute';
import { youTubeEmbed } from './youTubeEmbed';

export function MediaApp() {
  const route = useMediaRoute();
  const channel = channelAt(route.channelIndex);
  const openUrl = safeExternalUrl(channel.page ?? channel.hls);
  const youTubeUrl = useMemo(() => safeExternalUrl(youTubeEmbed(channel.yt)), [channel.yt]);
  const controls = useMediaControls();
  const player = useMediaPlayer({
    videoRef: controls.videoRef, channelIndex: route.channelIndex, youTubeUrl, mutedRef: controls.mutedRef, volumeRef: controls.volumeRef,
  });
  useMediaKeys({ onStepChannel: route.onStepChannel, onToggleMute: controls.onToggleMute, onToggleFullscreen: controls.onToggleFullscreen });

  return (
    <div className={CLASSES.root}>
      <MediaLegacyStyles />
      <MediaHero channelCount={CHANNEL_COUNT} />
      <div className={CLASSES.layout}>
        <ChannelList channelIndex={route.channelIndex} onSelectChannel={route.onSelectChannel} />
        <div className={CLASSES.stageColumn}>
          <MediaStage stageRef={controls.stageRef} videoRef={controls.videoRef} player={player} channelName={channel.name} youTubeUrl={youTubeUrl} openUrl={openUrl} />
          <ControlBar channelName={channel.name} controls={controls} isGridOn={route.isGridOn} openUrl={openUrl} onToggleGrid={route.onToggleGrid} />
          <MediaFoot />
          {route.isGridOn && <MediaGrid />}
        </div>
      </div>
    </div>
  );
}

export { CHANNELS } from './channels';
export { youTubeEmbed } from './youTubeEmbed';
export type { MediaChannel } from './types';
