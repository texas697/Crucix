import type { ChangeEvent, RefObject } from 'react';

export interface MediaChannel {
  id: string;
  name: string;
  region: string;
  color: string;
  hls: string;
  page?: string;
  yt?: string;
}

export type MediaPhase = 'loading' | 'ready' | 'error' | 'youtube';

export interface MediaRouteState {
  channelIndex: number;
  isGridOn: boolean;
  onSelectChannel: (index: number) => void;
  onStepChannel: (delta: number) => void;
  onToggleGrid: () => void;
}

export interface MediaPlayerState {
  phase: MediaPhase;
  errorMsg: string;
  youTubeSrc: string | null;
  onPlayYouTube: () => void;
  onRetry: () => void;
}

export interface MediaControlsState {
  videoRef: RefObject<HTMLVideoElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  mutedRef: RefObject<boolean>;
  volumeRef: RefObject<number>;
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
}
