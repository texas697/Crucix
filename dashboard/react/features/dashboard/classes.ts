import { MARKET_CLASSES } from './classesMarkets';
import { SHELL_CLASSES } from './classesShell';
import { SIGNAL_CLASSES } from './classesSignals';

export const CLASSES = { ...SHELL_CLASSES, ...SIGNAL_CLASSES, ...MARKET_CLASSES } as const;

export { HW_LEVEL_CLASSES, IDEA_TYPE_CLASSES, LAYER_DOT_CLASSES, ROW_CLASSES } from './classModifiers';
