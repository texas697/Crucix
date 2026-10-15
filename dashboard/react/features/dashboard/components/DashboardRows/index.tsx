import type { SweepData, UserProfile } from '../../../../api/types';
import type { Translator } from '../../../../shared/locale';
import { CLASSES } from '../../classes';
import type { LiveFeeds, TickerItem } from '../../types';
import { DisastersPanel } from '../DisastersPanel';
import { HealthWatchPanel } from '../HealthWatchPanel';
import { MarketsPanel } from '../MarketsPanel';
import { NewsTicker } from '../NewsTicker';
import { NuclearWatch } from '../NuclearWatch';
import { OutagesPanel } from '../OutagesPanel';
import { PanelRow } from '../PanelRow';
import { RiskGauges } from '../RiskGauges';
import { RowC } from '../RowC';
import { RowD } from '../RowD';
import { SensorGrid } from '../SensorGrid';
import { SignalCore } from '../SignalCore';
import { SweepDelta } from '../SweepDelta';

export interface DashboardRowsProps {
  data: SweepData;
  tickerItems: TickerItem[];
  t?: Translator;
  me: UserProfile | null;
  feeds: LiveFeeds;
  now: () => number;
  onGenerateIdeas: () => void;
}

export function DashboardRows({ data, tickerItems, t, me, feeds, now, onGenerateIdeas }: DashboardRowsProps) {
  return (
    <main className={CLASSES.main} id="main">
      <PanelRow name="a">
        <SensorGrid data={data} t={t} />
        <NewsTicker items={tickerItems} now={now} />
        <HealthWatchPanel data={data} t={t} />
      </PanelRow>
      <PanelRow name="b">
        <SignalCore data={data} t={t} />
        <NuclearWatch data={data} t={t} />
        <RiskGauges data={data} t={t} />
        <SweepDelta data={data} t={t} />
        <DisastersPanel data={data} t={t} quakes={feeds.quakes ?? undefined} />
        <OutagesPanel data={data} t={t} />
      </PanelRow>
      <PanelRow name="c">
        <RowC data={data} t={t} me={me} onGenerateIdeas={onGenerateIdeas} />
      </PanelRow>
      <PanelRow name="d">
        <RowD data={data} t={t} alerts={feeds.alerts ?? undefined} tracks={feeds.tracks ?? undefined} markets={feeds.markets ?? undefined} />
      </PanelRow>
      <PanelRow name="e">
        <MarketsPanel data={data} t={t} />
      </PanelRow>
    </main>
  );
}
