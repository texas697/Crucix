import { BAR_STYLES } from './stylesBar';
import { BRIEF_STYLES } from './stylesBrief';
import { FRAME_STYLES } from './stylesFrame';
import { INFO_STYLES } from './stylesInfo';
import { LEGEND_STYLES } from './stylesLegend';
import { PANEL_STYLES } from './stylesPanel';
import { POPUP_STYLES } from './stylesPopup';

export const STYLES = {
  ...FRAME_STYLES,
  ...BAR_STYLES,
  ...LEGEND_STYLES,
  ...INFO_STYLES,
  ...POPUP_STYLES,
  ...PANEL_STYLES,
  ...BRIEF_STYLES,
} as const;

export { MAP_FILL } from './stylesFrame';
