import type { ReactNode } from 'react';
import { makeLabel } from '../../label';
import type { MarketItem, PanelDataProps } from '../../types';
import { MarketRow } from '../MarketRow';
import { Panel } from '../Panel';
import { PanelSource } from '../PanelSource';

export interface PredictionMarketsPanelProps extends PanelDataProps {
  markets?: MarketItem[];
}

export function PredictionMarketsPanel({ t, markets }: PredictionMarketsPanelProps) {
  const tr = makeLabel(t);
  let body: ReactNode;
  if (!markets) {
    body = <PanelSource>Loading{'…'}</PanelSource>;
  } else if (!markets.length) {
    body = <PanelSource>No conflict markets right now.</PanelSource>;
  } else {
    body = markets.map((p, i) => <MarketRow key={i} market={p} />);
  }
  return (
    <Panel id="pPoly" title={tr('panels.predictionMarkets', 'Prediction markets')} badge="Polymarket" flex="1 1 280px">
      {body}
    </Panel>
  );
}
