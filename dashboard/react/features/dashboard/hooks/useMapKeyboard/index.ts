import { useEffect } from 'react';
import { REGION_ORDER, type RegionKey } from '../../../map/regions';
import type { DrawTool } from '../../../map/selection';

export interface UseMapKeyboardArgs {
  drawTool: DrawTool | null;
  isOverlayOpen: boolean;
  setDrawTool: (tool: DrawTool | null) => void;
  setRegion: (region: RegionKey) => void;
  onClosePopup: () => void;
}

const FORM_TAGS = /^(INPUT|TEXTAREA|SELECT)$/;

export function useMapKeyboard({ drawTool, isOverlayOpen, setDrawTool, setRegion, onClosePopup }: UseMapKeyboardArgs): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isOverlayOpen) return;
        if (drawTool) setDrawTool(null);
        else onClosePopup();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && FORM_TAGS.test(target.tagName)) return;
      const index = Number.parseInt(event.key, 10) - 1;
      const region = REGION_ORDER[index];
      if (index >= 0 && region) setRegion(region);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawTool, isOverlayOpen, setDrawTool, setRegion, onClosePopup]);
}
