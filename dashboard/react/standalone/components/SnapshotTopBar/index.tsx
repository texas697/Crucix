import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import type { HealthResponse, SweepMeta } from '../../../api/types';
import { SHELL_STYLES, StatusCluster, ThemeToggle, modelLabel, sweepAge } from '../../../app/AppShell/kit';
import { NAV_SURFACES, SURFACE_TITLES } from '../../../app/surfaces';
import type { Theme } from '../../../shared/theme';
import { CLASSES } from '../../classes';

export interface SnapshotTopBarProps {
  health: HealthResponse | null;
  meta: SweepMeta | null;
  mode: Theme;
  onToggleMode: () => void;
  now: () => number;
}

const LOGOS: Record<Theme, string> = {
  dark: './brand/mfb-intelligence-navbar-dark-transparent.png',
  light: './brand/mfb-intelligence-navbar-light-transparent.png',
};

export function SnapshotTopBar({ health, meta, mode, onToggleMode, now }: SnapshotTopBarProps) {
  const sourcesOk = meta?.sourcesOk ?? health?.sourcesOk ?? 0;
  const sourcesQueried = meta?.sourcesQueried ?? 0;

  return (
    <AppBar className={CLASSES.topBar} position="relative" sx={SHELL_STYLES.bar}>
      <Toolbar className={CLASSES.toolbar} sx={SHELL_STYLES.toolbar}>
        <Stack direction="row" className={CLASSES.topLeft} sx={SHELL_STYLES.left}>
          <Box component="span" className={CLASSES.brand} sx={SHELL_STYLES.brand} aria-label="Dashboard">
            <Box
              component="img"
              className={CLASSES.brandLogo}
              sx={SHELL_STYLES.brandLogo}
              src={LOGOS[mode]}
              alt="MFB Services Intelligence"
              width={1124}
              height={160}
            />
          </Box>
          <Tabs component="nav" aria-label="Primary" className={CLASSES.nav} sx={SHELL_STYLES.nav} value="dashboard">
            {NAV_SURFACES.map((surface) => (
              <Tab
                key={surface}
                value={surface}
                label={SURFACE_TITLES[surface]}
                className={CLASSES.navTab}
                aria-current={surface === 'dashboard' ? 'page' : undefined}
              />
            ))}
          </Tabs>
        </Stack>
        <Box className={CLASSES.spacer} sx={SHELL_STYLES.spacer} />
        <Stack direction="row" className={CLASSES.topRight} sx={SHELL_STYLES.right}>
          <StatusCluster
            sourcesOk={sourcesOk}
            sourcesQueried={sourcesQueried}
            modelLabel={modelLabel(null)}
            ageLabel={sweepAge(meta?.timestamp, now())}
            timestamp={meta?.timestamp}
          />
          <ThemeToggle mode={mode} onToggle={onToggleMode} />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
