import type { Components, Theme } from '@mui/material/styles';
import { createControlComponents } from './componentsControls';
import { createSurfaceComponents } from './componentsSurfaces';
import { tokensForMode, type ThemeMode } from './tokens';

export function createComponents(mode: ThemeMode): Components<Theme> {
  const tokens = tokensForMode(mode);
  return {
    ...createSurfaceComponents(tokens),
    ...createControlComponents(tokens),
  };
}
