import { createContext } from 'react';
import type { SettingsDialogValue } from './types';

const noop = (): void => {};

export const SettingsDialogContext = createContext<SettingsDialogValue>({
  isOpen: false,
  onOpen: noop,
  onClose: noop,
});
