import { useCallback, useMemo, useState } from 'react';
import type { SignalGuideState } from '../../types';

export function useSignalGuide(): SignalGuideState {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const onOpenGuide = useCallback(() => setIsGuideOpen(true), []);
  const onCloseGuide = useCallback(() => setIsGuideOpen(false), []);
  return useMemo(() => ({ isGuideOpen, onOpenGuide, onCloseGuide }), [isGuideOpen, onOpenGuide, onCloseGuide]);
}
