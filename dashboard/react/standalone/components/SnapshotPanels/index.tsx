import Box from '@mui/material/Box';
import type { SweepData } from '../../../api/types';
import type { createTranslator } from '../../../shared/locale';
import { DisastersPanel } from '../../../features/dashboard/components/DisastersPanel';
import { HealthWatchPanel } from '../../../features/dashboard/components/HealthWatchPanel';
import { MarketsPanel } from '../../../features/dashboard/components/MarketsPanel';
import { NewsTicker } from '../../../features/dashboard/components/NewsTicker';
import { NuclearWatch } from '../../../features/dashboard/components/NuclearWatch';
import { OutagesPanel } from '../../../features/dashboard/components/OutagesPanel';
import { PanelRow } from '../../../features/dashboard/components/PanelRow';
import { RiskGauges } from '../../../features/dashboard/components/RiskGauges';
import { RowC } from '../../../features/dashboard/components/RowC';
import { RowD } from '../../../features/dashboard/components/RowD';
import { SensorGrid } from '../../../features/dashboard/components/SensorGrid';
import { SignalCore } from '../../../features/dashboard/components/SignalCore';
import { SweepDelta } from '../../../features/dashboard/components/SweepDelta';
import type { TickerItem } from '../../../features/dashboard/types';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface SnapshotPanelsProps {
  data: SweepData;
  tickerItems: TickerItem[];
  t?: ReturnType<typeof createTranslator>;
  now: () => number;
}

const noop = (): void => {};

export function SnapshotPanels({ data, tickerItems, t, now }: SnapshotPanelsProps) {
  return (
    <Box component="main" className={CLASSES.main} sx={STYLES.main} id="main">
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
        <DisastersPanel data={data} t={t} />
        <OutagesPanel data={data} t={t} />
      </PanelRow>
      <PanelRow name="c">
        <RowC data={data} t={t} me={null} onGenerateIdeas={noop} />
      </PanelRow>
      <PanelRow name="d">
        <RowD data={data} t={t} />
      </PanelRow>
      <PanelRow name="e">
        <MarketsPanel data={data} t={t} />
      </PanelRow>
    </Box>
  );
}
