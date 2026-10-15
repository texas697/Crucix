import { useContext } from 'react';
import { SessionContext } from '../../context';
import type { SessionValue } from '../../types';

export function useSession(): SessionValue {
  return useContext(SessionContext);
}
