import IconButton from '@mui/material/IconButton';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import type { Theme } from '../../../../shared/theme';
import { CLASSES } from '../../../classes';

export interface ThemeToggleProps {
  mode: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ mode, onToggle }: ThemeToggleProps) {
  const next = mode === 'light' ? 'dark' : 'light';
  return (
    <IconButton className={CLASSES.themeToggle} onClick={onToggle} aria-label={`Switch to ${next} theme`}>
      {mode === 'light'
        ? <DarkModeIcon className={CLASSES.themeIcon} fontSize="small" />
        : <LightModeIcon className={CLASSES.themeIcon} fontSize="small" />}
    </IconButton>
  );
}
