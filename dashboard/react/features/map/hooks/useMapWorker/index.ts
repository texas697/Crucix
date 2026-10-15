import { useState } from 'react';
import { registerMapWorker } from '../../mapWorker';

export function useMapWorker(): string {
  const [url] = useState(() => registerMapWorker());
  return url;
}
