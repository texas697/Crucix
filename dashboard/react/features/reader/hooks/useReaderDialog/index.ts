import { useCallback, useMemo } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { PHONE_QUERY } from '../../consts';
import type { ReaderDialogState } from '../../types';

export interface UseReaderDialogArgs {
  onClose: () => void;
}

export function useReaderDialog({ onClose }: UseReaderDialogArgs): ReaderDialogState {
  const isFullScreen = useMediaQuery(PHONE_QUERY);
  const onDialogClose = useCallback(() => { onClose(); }, [onClose]);
  return useMemo(() => ({ isFullScreen, onDialogClose }), [isFullScreen, onDialogClose]);
}
