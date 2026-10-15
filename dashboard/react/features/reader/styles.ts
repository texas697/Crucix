import type { SxProps, Theme } from '@mui/material/styles';
import { BODY_STYLES } from './stylesBody';
import { FRAME_STYLES } from './stylesFrame';

export const STYLES = { ...FRAME_STYLES, ...BODY_STYLES } satisfies Record<string, SxProps<Theme>>;
