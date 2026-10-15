import type { TypographyOptions } from '@mui/material/styles/createTypography';
import { FONT_MONO, FONT_SANS } from './tokens';

export function createTypography(): TypographyOptions {
  return {
    fontFamily: FONT_SANS,
    fontSize: 13,
    htmlFontSize: 16,
    h1: { fontFamily: FONT_SANS, fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25 },
    h3: { fontFamily: FONT_SANS, fontSize: 18, fontWeight: 600, lineHeight: 1.3 },
    h4: { fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, lineHeight: 1.35 },
    h5: { fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: 500, lineHeight: 1.4 },
    h6: { fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontFamily: FONT_SANS, fontSize: 14.5, lineHeight: 1.55 },
    subtitle2: { fontFamily: FONT_SANS, fontSize: 12.5, fontWeight: 500, lineHeight: 1.5 },
    body1: { fontFamily: FONT_SANS, fontSize: 13.5, lineHeight: 1.55 },
    body2: { fontFamily: FONT_SANS, fontSize: 12.5, lineHeight: 1.5 },
    button: { fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, textTransform: 'none', lineHeight: 1.2 },
    caption: { fontFamily: FONT_MONO, fontSize: 12, lineHeight: 1.4 },
    overline: { fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' },
  };
}
