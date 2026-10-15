import { useContext } from 'react';
import { SettingsDialogContext } from '../../context';
import type { SettingsDialogValue } from '../../types';

export function useSettingsDialog(): SettingsDialogValue {
  return useContext(SettingsDialogContext);
}
