import { useEffect, useRef, type RefObject } from 'react';
import Hls from 'hls.js';
import { canPlayHlsNatively, safeLoad, safePlay } from '../../playback';
import type { MediaChannel } from '../../types';

export interface UseGridCellArgs {
  channel: MediaChannel;
}

export function useGridCell({ channel }: UseGridCellArgs): RefObject<HTMLVideoElement | null> {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const src = video.dataset.src || channel.hls;
    let hls: Hls | null = null;
    if (canPlayHlsNatively(video)) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }
    safePlay(video);
    return () => {
      if (hls) hls.destroy();
      video.removeAttribute('src');
      safeLoad(video);
    };
  }, [channel.hls]);

  return videoRef;
}
