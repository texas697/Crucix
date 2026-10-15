import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { useApi } from '../../app/AppProviders/hooks/useApi';
import { useSession } from '../../app/AppProviders/hooks/useSession';
import { useSweepStatus } from '../../app/AppProviders/hooks/useSweepStatus';
import { useThemeMode } from '../../app/AppProviders/hooks/useThemeMode';
import { useSurfaceRoute } from '../../app/AppRouter/hooks/useSurfaceRoute';
import { useSettingsDialog } from '../../app/AppShell/hooks/useSettingsDialog';
import { CLASSES } from './classes';
import { DashboardRows } from './components/DashboardRows';
import { MapStage } from './components/MapStage';
import { SignalGuide } from './components/SignalGuide';
import { StartupState } from './components/StartupState';
import { useDashboardMap } from './hooks/useDashboardMap';
import { useDashboardView } from './hooks/useDashboardView';
import { useGuideOverlay } from './hooks/useGuideOverlay';
import { useIdeas } from './hooks/useIdeas';
import { useLiveFeeds } from './hooks/useLiveFeeds';
import { useMapKeyboard } from './hooks/useMapKeyboard';
import { barMarkerCount } from './markerCount';
import type { DashboardAppProps } from './types';

export function DashboardApp({ now = Date.now }: DashboardAppProps) {
  const api = useApi();
  const { me } = useSession();
  const { data, health, sweepError } = useSweepStatus();
  const { mode: theme } = useThemeMode();
  const { location, history } = useSurfaceRoute();
  const { isOpen: isSettingsOpen, onOpen: onOpenSettings } = useSettingsDialog();
  const ideas = useIdeas({ api, me, data, onOpenSettings });
  const feeds = useLiveFeeds({ api, isEnabled: ideas.panelData !== null });
  const map = useDashboardMap({
    api, data: ideas.panelData, tracks: feeds.tracks, quakes: feeds.quakes, href: location.href, history,
  });
  const view = useDashboardView({ data: ideas.panelData, region: map.region.region });
  const guide = useGuideOverlay({ href: location.href });
  useMapKeyboard({
    drawTool: map.selection.drawTool,
    isOverlayOpen: guide.isGuideOpen || isSettingsOpen,
    setDrawTool: map.selection.setDrawTool,
    setRegion: map.region.setRegion,
    onClosePopup: map.popup.onClosePopup,
  });
  const panelData = ideas.panelData;
  const markers = useMemo(() => barMarkerCount(panelData), [panelData]);
  const meta = data?.meta ?? null;

  return (
    <>
      {sweepError && <Box className={CLASSES.sweepError} role="alert">Sweep error: {sweepError}</Box>}
      {!data || !panelData || !map.plot
        ? <StartupState health={health} now={now} />
        : (
          <>
            <MapStage
              map={map}
              theme={theme}
              sourcesOk={meta?.sourcesOk ?? 0}
              sourcesQueried={meta?.sourcesQueried ?? 0}
              markers={markers}
              newsCount={view.tickerItems.length}
              onOpenGuide={guide.onOpenGuide}
            />
            <DashboardRows
              data={view.viewData ?? panelData}
              tickerItems={view.tickerFeed}
              t={view.t}
              me={me}
              feeds={feeds}
              now={now}
              onGenerateIdeas={ideas.onGenerateIdeas}
            />
          </>
        )}
      <SignalGuide isOpen={guide.isGuideOpen} onClose={guide.onCloseGuide} />
    </>
  );
}

export type { DashboardAppProps } from './types';
