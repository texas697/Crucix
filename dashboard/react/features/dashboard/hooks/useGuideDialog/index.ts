import { useCallback, useEffect, useRef, type MouseEvent, type RefObject } from 'react';

export interface UseGuideDialogArgs {
  isOpen: boolean;
  onClose: () => void;
}

export interface GuideDialogState {
  panelRef: RefObject<HTMLDivElement | null>;
  onBackdropClick: (event: MouseEvent) => void;
}

export function useGuideDialog({ isOpen, onClose }: UseGuideDialogArgs): GuideDialogState {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  const onBackdropClick = useCallback((e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return { panelRef, onBackdropClick };
}
