import { useMemo } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import { Outlet } from 'react-router-dom';
import { SettingsOverlay } from '../../features/settings/SettingsOverlay';
import { useApi } from '../AppProviders/hooks/useApi';
import { useSession } from '../AppProviders/hooks/useSession';
import { useSweepStatus } from '../AppProviders/hooks/useSweepStatus';
import { useThemeMode } from '../AppProviders/hooks/useThemeMode';
import { CLASSES } from '../classes';
import { isReactSurface, readUiFlags } from '../uiFlags';
import { AccountControls } from './components/AccountControls';
import { BrandLink } from './components/BrandLink';
import { NavTabs } from './components/NavTabs';
import { StatusCluster } from './components/StatusCluster';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsDialogContext } from './context';
import { useActiveSurface } from './hooks/useActiveSurface';
import { useNavTransition } from './hooks/useNavTransition';
import { useSettingsDialogState } from './hooks/useSettingsDialogState';
import { STYLES } from './styles';
import type { AppShellProps } from './types';
import { modelLabel, sweepAge } from './utils';

export function AppShell({ now = Date.now }: AppShellProps) {
  const api = useApi();
  const { me, setMe, onLogout } = useSession();
  const { health, meta } = useSweepStatus();
  const { mode, onToggleMode } = useThemeMode();
  const active = useActiveSurface();
  const nav = useNavTransition({ active });
  const settings = useSettingsDialogState();
  const flags = useMemo(() => readUiFlags(), []);

  const sourcesOk = meta?.sourcesOk ?? health?.sourcesOk ?? 0;
  const sourcesQueried = meta?.sourcesQueried ?? 0;

  return (
    <SettingsDialogContext.Provider value={settings}>
      <Box className={CLASSES.root} sx={STYLES.root}>
        <AppBar className={CLASSES.bar} position="relative" sx={STYLES.bar}>
          <Toolbar className={CLASSES.toolbar} sx={STYLES.toolbar}>
            <Stack direction="row" className={CLASSES.left} sx={STYLES.left}>
              <BrandLink mode={mode} isRouterLink={isReactSurface(flags, 'dashboard')} />
              <NavTabs active={nav.pendingSurface ?? active} flags={flags} onSelect={nav.onSelect} />
            </Stack>
            <Box className={CLASSES.spacer} sx={STYLES.spacer} />
            <Stack direction="row" className={CLASSES.right} sx={STYLES.right}>
              <StatusCluster
                sourcesOk={sourcesOk}
                sourcesQueried={sourcesQueried}
                modelLabel={modelLabel(me)}
                ageLabel={sweepAge(meta?.timestamp, now())}
                timestamp={meta?.timestamp}
              />
              <ThemeToggle mode={mode} onToggle={onToggleMode} />
              <AccountControls me={me} onOpenSettings={settings.onOpen} onLogout={onLogout} />
            </Stack>
          </Toolbar>
          {nav.pendingSurface && <LinearProgress className={CLASSES.navProgress} sx={STYLES.navProgress} />}
        </AppBar>
        <Box className={CLASSES.outlet} sx={STYLES.outlet}>
          <Outlet />
        </Box>
        <SettingsOverlay isOpen={settings.isOpen} me={me} api={api} onClose={settings.onClose} onProfileChange={setMe} />
      </Box>
    </SettingsDialogContext.Provider>
  );
}

export { useSettingsDialog } from './hooks/useSettingsDialog';
export type { AppShellProps, NavTransitionValue, SettingsDialogValue } from './types';
