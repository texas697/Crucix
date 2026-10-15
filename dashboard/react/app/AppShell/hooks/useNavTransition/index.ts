import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { NavSurface } from '../../../surfaces';
import type { NavTransitionValue } from '../../types';

export interface UseNavTransitionArgs {
  active: NavSurface | null;
}

export function useNavTransition({ active }: UseNavTransitionArgs): NavTransitionValue {
  const { key } = useLocation();
  const [target, setTarget] = useState<NavSurface | null>(null);

  useEffect(() => {
    setTarget(null);
  }, [key]);

  const onSelect = useCallback((surface: NavSurface) => {
    setTarget(surface);
  }, []);

  const pendingSurface = target !== null && target !== active ? target : null;

  return useMemo(() => ({ pendingSurface, onSelect }), [pendingSurface, onSelect]);
}
