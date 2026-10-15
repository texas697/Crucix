import { useCallback, useEffect, useRef, type RefCallback } from 'react';

export interface UseGuideDialogArgs {
  isOpen: boolean;
  onClose: () => void;
}

export interface GuideDialogState {
  panelRef: RefCallback<HTMLDivElement>;
}

export function useGuideDialog({ isOpen, onClose }: UseGuideDialogArgs): GuideDialogState {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocusedRef.current?.focus?.();
      previouslyFocusedRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const panelRef = useCallback<RefCallback<HTMLDivElement>>((node) => {
    if (node && !node.contains(document.activeElement)) node.focus();
  }, []);

  return { panelRef };
}
