import type { NavSurface } from '../surfaces';

export interface SettingsDialogValue {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export interface NavTransitionValue {
  pendingSurface: NavSurface | null;
  onSelect: (surface: NavSurface) => void;
}

export interface AppShellProps {
  now?: () => number;
}
