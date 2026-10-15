import { useContext } from 'react';
import type { ApiClient } from '../../../../api/client';
import { ApiContext } from '../../context';

export function useApi(): ApiClient {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi must be used inside AppProviders');
  return api;
}
