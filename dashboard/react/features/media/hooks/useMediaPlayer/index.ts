import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import Hls from 'hls.js';
import { channelAt } from '../../channels';
import { canPlayHlsNatively, safeLoad, safePlay } from '../../playback';
import type { MediaPhase, MediaPlayerState } from '../../types';

export interface UseMediaPlayerArgs {
  videoRef: RefObject<HTMLVideoElement | null>;
  channelIndex: number;
  youTubeUrl: string | null;
  mutedRef: RefObject<boolean>;
  volumeRef: RefObject<number>;
}

const NETWORK_FAIL = 'The broadcaster feed did not load (it may be geo-restricted or offline).';

export function useMediaPlayer({ videoRef, channelIndex, youTubeUrl, mutedRef, volumeRef }: UseMediaPlayerArgs): MediaPlayerState {
  const [phase, setPhase] = useState<MediaPhase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [youTubeSrc, setYouTubeSrc] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let hls: Hls | null = null;
    const fail = (msg: string) => {
      setErrorMsg(msg);
      setPhase('error');
    };
    const onLoaded = () => {
      setPhase('ready');
      video.muted = mutedRef.current;
      video.volume = volumeRef.current;
      safePlay(video);
    };
    const onVideoError = () => fail('The broadcaster feed did not load.');

    if (!youTubeSrc) {
      const c = channelAt(channelIndex);
      setPhase('loading');
      video.removeAttribute('src');
      safeLoad(video);
      if (canPlayHlsNatively(video)) {
        video.src = c.hls;
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        video.addEventListener('error', onVideoError, { once: true });
      } else if (Hls.isSupported()) {
        hls = new Hls({ lowLatencyMode: true, backBufferLength: 30, maxBufferLength: 20 });
        hls.loadSource(c.hls);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, onLoaded);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data || !data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
          else fail(NETWORK_FAIL);
        });
      } else {
        fail('This browser cannot play HLS streams.');
      }
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onVideoError);
      if (hls) hls.destroy();
      video.removeAttribute('src');
      safeLoad(video);
    };
  }, [videoRef, channelIndex, reloadToken, youTubeSrc, mutedRef, volumeRef]);

  useEffect(() => {
    setYouTubeSrc(null);
  }, [channelIndex]);

  const onPlayYouTube = useCallback(() => {
    if (!youTubeUrl) return;
    setYouTubeSrc(youTubeUrl);
    setPhase('youtube');
  }, [youTubeUrl]);

  const onRetry = useCallback(() => setReloadToken((t) => t + 1), []);

  return useMemo(
    () => ({ phase, errorMsg, youTubeSrc, onPlayYouTube, onRetry }),
    [phase, errorMsg, youTubeSrc, onPlayYouTube, onRetry],
  );
}
