import { useCallback, useMemo, type MouseEvent } from 'react';

export interface UseDigestCardActionsArgs {
  id: string;
  onOpen: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

export interface DigestCardActions {
  onOpenCard: () => void;
  onRateUp: (event: MouseEvent) => void;
  onRateDown: (event: MouseEvent) => void;
  onStopPropagation: (event: MouseEvent) => void;
}

export function useDigestCardActions({ id, onOpen, onRate }: UseDigestCardActionsArgs): DigestCardActions {
  const onOpenCard = useCallback(() => onOpen(id), [onOpen, id]);
  const onRateUp = useCallback((e: MouseEvent) => { e.stopPropagation(); onRate(id, 1); }, [onRate, id]);
  const onRateDown = useCallback((e: MouseEvent) => { e.stopPropagation(); onRate(id, -1); }, [onRate, id]);
  const onStopPropagation = useCallback((e: MouseEvent) => e.stopPropagation(), []);
  return useMemo(() => ({ onOpenCard, onRateUp, onRateDown, onStopPropagation }), [onOpenCard, onRateUp, onRateDown, onStopPropagation]);
}
