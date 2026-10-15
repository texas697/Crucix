import { useCallback, useState } from 'react';

export function useOriginalToggle() {
  const [isOriginalShown, setIsOriginalShown] = useState(false);
  const onToggleOriginal = useCallback(() => setIsOriginalShown((v) => !v), []);
  return { isOriginalShown, onToggleOriginal };
}
