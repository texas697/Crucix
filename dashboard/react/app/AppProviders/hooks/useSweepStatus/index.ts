import { useContext } from 'react';
import { SweepStatusContext } from '../../context';
import type { SweepStatusValue } from '../../types';

export function useSweepStatus(): SweepStatusValue {
  return useContext(SweepStatusContext);
}
