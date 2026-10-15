import { ROW_STYLES } from './stylesRows';
import { TONE_STYLES } from './stylesTone';

export const STYLES = { ...TONE_STYLES, ...ROW_STYLES } as const;

export { ROW_STYLES } from './stylesRows';
export { TONE_STYLES } from './stylesTone';
