import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { MediaControlsState } from '../../types';

type FullscreenStage = HTMLDivElement & { webkitRequestFullscreen?: () => void };

function requestStageFullscreen(stage: FullscreenStage | null): void {
  try {
    if (document.fullscreenElement) {
      if (typeof document.exitFullscreen === 'function') void document.exitFullscreen().catch(() => undefined);
    } else if (stage) {
      if (typeof stage.requestFullscreen === 'function') void stage.requestFullscreen().catch(() => undefined);
      else if (typeof stage.webkitRequestFullscreen === 'function') stage.webkitRequestFullscreen();
    }
  } catch {
    return;
  }
}

async function togglePictureInPicture(video: HTMLVideoElement | null): Promise<void> {
  try {
    if (document.pictureInPictureElement) {
      if (typeof document.exitPictureInPicture === 'function') await document.exitPictureInPicture();
    } else if (video && typeof video.requestPictureInPicture === 'function') {
      await video.requestPictureInPicture();
    }
  } catch {
    return;
  }
}

export function useMediaControls(): MediaControlsState {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);

  useEffect(() => {
    mutedRef.current = isMuted;
    volumeRef.current = volume;
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
      video.volume = volume;
    }
  }, [isMuted, volume]);

  const onToggleMute = useCallback(() => setIsMuted((m) => !m), []);

  const onVolumeInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setVolume(next);
    setIsMuted(next === 0);
  }, []);

  const onToggleFullscreen = useCallback(() => requestStageFullscreen(stageRef.current), []);
  const onTogglePip = useCallback(() => { void togglePictureInPicture(videoRef.current); }, []);

  return useMemo(() => ({
    videoRef, stageRef, mutedRef, volumeRef, isMuted, volume, onToggleMute, onVolumeInput, onToggleFullscreen, onTogglePip,
  }), [isMuted, volume, onToggleMute, onVolumeInput, onToggleFullscreen, onTogglePip]);
}
