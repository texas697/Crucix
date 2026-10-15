import type { SxProps, Theme } from '@mui/material/styles';
import { FONT_MONO } from '../../../../theme';
import { TONE_STYLES } from '../../styles';

export const STYLES = {
  hwRisk: { fontFamily: FONT_MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' },
} satisfies Record<string, SxProps<Theme>>;

export function riskTagSx(color: string | undefined): SxProps<Theme> {
  return [STYLES.hwRisk, color ? { color } : TONE_STYLES.text2];
}
