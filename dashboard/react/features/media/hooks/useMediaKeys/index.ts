import { useEffect } from 'react';

export interface UseMediaKeysArgs {
  onStepChannel: (delta: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export function useMediaKeys({ onStepChannel, onToggleMute, onToggleFullscreen }: UseMediaKeysArgs): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') onStepChannel(1);
      else if (e.key === 'ArrowLeft') onStepChannel(-1);
      else if (e.key === 'm') onToggleMute();
      else if (e.key === 'f') onToggleFullscreen();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onStepChannel, onToggleMute, onToggleFullscreen]);
}
