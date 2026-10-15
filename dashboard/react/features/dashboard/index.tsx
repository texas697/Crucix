import { useApi } from '../../app/AppProviders/hooks/useApi';
import { useSession } from '../../app/AppProviders/hooks/useSession';
import { useSweepStatus } from '../../app/AppProviders/hooks/useSweepStatus';
import { useThemeMode } from '../../app/AppProviders/hooks/useThemeMode';
import { useSurfaceRoute } from '../../app/AppRouter/hooks/useSurfaceRoute';
import { useSettingsDialog } from '../../app/AppShell/hooks/useSettingsDialog';
import { CLASSES } from './classes';
import { DashboardLegacyStyles } from './components/DashboardLegacyStyles';
import { DashboardRows } from './components/DashboardRows';
import { MapStage } from './components/MapStage';
import { SignalGuide } from './components/SignalGuide';
import { StartupState } from './components/StartupState';
import { useDashboardMap } from './hooks/useDashboardMap';
import { useDashboardView } from './hooks/useDashboardView';
import { useGuideOverlay } from './hooks/useGuideOverlay';
import { useIdeas } from './hooks/useIdeas';
import { useLiveFeeds } from './hooks/useLiveFeeds';
import type { DashboardAppProps } from './types';

export function DashboardApp({ now = Date.now }: DashboardAppProps) {
  const api = useApi();
  const { me } = useSession();
  const { data, health, sweepError: transportError } = useSweepStatus();
  const { mode: theme } = useThemeMode();
  const { location, history } = useSurfaceRoute();
  const { onOpen: onOpenSettings } = useSettingsDialog();
  const ideas = useIdeas({ api, me, data, onOpenSettings });
  const feeds = useLiveFeeds({ api, enabled: ideas.panelData !== null });
  const map = useDashboardMap({
    api, data: ideas.panelData, tracks: feeds.tracks, quakes: feeds.quakes, href: location.href, history,
  });
  const view = useDashboardView({ data: ideas.panelData, region: map.region.region });
  const guide = useGuideOverlay({ href: location.href });
  const sweepError = map.selection.briefError ?? transportError;
  const panelData = ideas.panelData;
  const meta = data?.meta ?? null;

  return (
    <>
      <DashboardLegacyStyles />
      {sweepError && <div className={CLASSES.sweepError} role="alert">Sweep error: {sweepError}</div>}
      {!data || !panelData || !map.plot
        ? <StartupState health={health} now={now} />
        : (
          <>
            <MapStage
              map={map}
              theme={theme}
              sourcesOk={meta?.sourcesOk ?? 0}
              sourcesQueried={meta?.sourcesQueried ?? 0}
              newsCount={view.tickerItems.length}
              onOpenGuide={guide.onOpenGuide}
            />
            <DashboardRows
              data={view.viewData ?? panelData}
              tickerItems={view.tickerItems}
              t={view.t}
              me={me}
              feeds={feeds}
              now={now}
              onGenerateIdeas={ideas.onGenerateIdeas}
            />
          </>
        )}
      <SignalGuide open={guide.isGuideOpen} onClose={guide.onCloseGuide} />
    </>
  );
}

export type { DashboardAppProps } from './types';
