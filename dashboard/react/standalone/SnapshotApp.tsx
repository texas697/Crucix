import Box from '@mui/material/Box';
import { useThemeMode } from '../app/AppProviders/hooks/useThemeMode';
import { DashboardLegacyStyles } from '../features/dashboard/components/DashboardLegacyStyles';
import { SignalGuide } from '../features/dashboard/components/SignalGuide';
import { StartupState } from '../features/dashboard/components/StartupState';
import { CLASSES } from './classes';
import { SnapshotMap } from './components/SnapshotMap';
import { SnapshotPanels } from './components/SnapshotPanels';
import { SnapshotTopBar } from './components/SnapshotTopBar';
import { useSignalGuide } from './hooks/useSignalGuide';
import { useSnapshotMap } from './hooks/useSnapshotMap';
import { useSnapshotView } from './hooks/useSnapshotView';
import { STYLES } from './styles';
import type { SnapshotAppProps } from './types';

export function SnapshotApp({ snapshot, now = Date.now }: SnapshotAppProps) {
  const { mode, onToggleMode } = useThemeMode();
  const guide = useSignalGuide();
  const map = useSnapshotMap({ data: snapshot });
  const view = useSnapshotView({ snapshot, region: map.region.region });

  return (
    <Box className={CLASSES.surface} sx={STYLES.surface} data-surface="dashboard">
      <DashboardLegacyStyles />
      <SnapshotTopBar health={view.health} meta={view.meta} mode={mode} onToggleMode={onToggleMode} now={now} />
      {!snapshot || !map.plot
        ? <StartupState health={view.health} now={now} />
        : (
          <>
            <SnapshotMap
              map={map}
              theme={mode}
              sourcesOk={view.meta?.sourcesOk ?? 0}
              sourcesQueried={view.meta?.sourcesQueried ?? 0}
              newsCount={view.tickerItems.length}
              onOpenGuide={guide.onOpenGuide}
            />
            <SnapshotPanels data={view.viewData ?? snapshot} tickerItems={view.tickerItems} t={view.t} now={now} />
          </>
        )}
      <SignalGuide open={guide.isGuideOpen} onClose={guide.onCloseGuide} />
    </Box>
  );
}
