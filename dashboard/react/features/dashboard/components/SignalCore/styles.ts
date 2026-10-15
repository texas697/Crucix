import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { accentGradient } from '../../styleConsts';

export const STYLES = {
  metric: { display: 'flex', flexDirection: 'column', gap: '7px', mb: '14px', '&:last-child': { mb: 0 } },
  metricTop: { display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: 13 },
  metricLabel: { color: (theme) => theme.palette.crucix.text2 },
  metricValue: { fontFamily: FONT_MONO, fontSize: 13, color: 'text.primary' },
  metricBar: (theme) => ({ height: 4, bgcolor: theme.palette.crucix.raised, borderRadius: '4px', overflow: 'hidden', m: 0 }),
  metricBarFill: (theme) => ({ display: 'block', height: '100%', borderRadius: '4px', background: accentGradient(theme) }),
} satisfies Record<string, SxProps<Theme>>;

export function metricFill(percent: number): SxProps<Theme> {
  return [STYLES.metricBarFill, { width: `${percent}%` }];
}
