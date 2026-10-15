import { useCallback, useMemo, useState } from 'react';

export interface AlertsSoundState {
  isSoundOn: boolean;
  onToggleSound: () => void;
}

export function useAlertsSound(): AlertsSoundState {
  const [isSoundOn, setIsSoundOn] = useState(false);
  const onToggleSound = useCallback(() => setIsSoundOn((v) => !v), []);
  return useMemo(() => ({ isSoundOn, onToggleSound }), [isSoundOn, onToggleSound]);
}
