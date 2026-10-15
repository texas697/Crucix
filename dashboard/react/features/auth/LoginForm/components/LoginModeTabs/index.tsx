import { useCallback, type SyntheticEvent } from 'react';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { CLASSES } from '../../../classes';
import { TAB_LABELS, TEXT } from '../../consts';
import { STYLES } from '../../styles';
import type { LoginMode } from '../../types';

export interface LoginModeTabsProps {
  mode: LoginMode;
  hasSignup: boolean;
  onSelectMode: (mode: LoginMode) => void;
}

export function LoginModeTabs({ mode, hasSignup, onSelectMode }: LoginModeTabsProps) {
  const onChange = useCallback(
    (_event: SyntheticEvent, value: LoginMode) => onSelectMode(value),
    [onSelectMode],
  );
  return (
    <Tabs className={CLASSES.tabs} sx={STYLES.tabs} value={mode} onChange={onChange} aria-label={TEXT.tabsLabel}>
      <Tab className={CLASSES.tabSignin} sx={STYLES.tab} value="signin" label={TAB_LABELS.signin} disableRipple />
      {hasSignup && <Tab className={CLASSES.tabSignup} sx={STYLES.tab} value="signup" label={TAB_LABELS.signup} disableRipple />}
      <Tab className={CLASSES.tabReset} sx={STYLES.tab} value="reset" label={TAB_LABELS.reset} disableRipple />
    </Tabs>
  );
}
