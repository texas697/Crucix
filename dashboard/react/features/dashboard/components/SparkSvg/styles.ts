import type { SxProps, Theme } from '@mui/material/styles';

export const STYLES = {
  sparkSvg: { display: 'inline-block', width: 52, height: 18, verticalAlign: 'middle', ml: '4px' },
  sparkLine: { fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' },
  sparkGood: { stroke: (theme) => theme.palette.crucix.accent },
  sparkBad: { stroke: (theme) => theme.palette.crucix.danger },
  sparkDot: { r: 2 },
  sparkDotGood: { fill: (theme) => theme.palette.crucix.accent },
  sparkDotBad: { fill: (theme) => theme.palette.crucix.danger },
} satisfies Record<string, SxProps<Theme>>;
