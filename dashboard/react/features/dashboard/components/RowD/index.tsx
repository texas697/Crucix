import type { AlertItem, MarketItem, PanelDataProps, TrackItem } from '../../types';
import { AlertsPanel } from '../AlertsPanel';
import { PredictionMarketsPanel } from '../PredictionMarketsPanel';
import { ThreatPanel } from '../ThreatPanel';
import { TracksPanel } from '../TracksPanel';

export interface RowDProps extends PanelDataProps {
  alerts?: AlertItem[];
  tracks?: TrackItem[];
  markets?: MarketItem[];
}

export function RowD({ data, t, alerts, tracks, markets }: RowDProps) {
  return (
    <>
      <AlertsPanel data={data} t={t} alerts={alerts} />
      <ThreatPanel data={data} t={t} />
      <TracksPanel data={data} t={t} tracks={tracks} />
      <PredictionMarketsPanel data={data} t={t} markets={markets} />
    </>
  );
}
