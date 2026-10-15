import { useCallback, useMemo, useState } from 'react';
import { parseUrl } from '../../../../state/url';
import type { GuideOverlayState } from '../../stateTypes';

export interface UseGuideOverlayArgs {
  href: string;
}

export function useGuideOverlay({ href }: UseGuideOverlayArgs): GuideOverlayState {
  const [isGuideOpen, setIsGuideOpen] = useState(() => parseUrl(href).q.guide === '1');
  const onOpenGuide = useCallback(() => setIsGuideOpen(true), []);
  const onCloseGuide = useCallback(() => setIsGuideOpen(false), []);
  return useMemo(() => ({ isGuideOpen, onOpenGuide, onCloseGuide }), [isGuideOpen, onOpenGuide, onCloseGuide]);
}
