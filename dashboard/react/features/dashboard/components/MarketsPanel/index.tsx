import { CLASSES } from '../../classes';
import { makeLabel } from '../../label';
import { STYLES } from '../../styles';
import type { PanelDataProps } from '../../types';
import { MacroCard } from '../MacroCard';
import { Panel } from '../Panel';
import { QuoteCard } from '../QuoteCard';
import { SparkSvg } from '../SparkSvg';
import { marketsView } from './metrics';

export function MarketsPanel({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const view = marketsView(data);
  const hasMarkets = view.indexes.length > 0 || view.crypto.length > 0;
  return (
    <Panel id="pMarkets" title={tr('panels.macroMarkets', 'Macro + markets')} badge={view.isLive ? 'Live' : 'Delayed'} flex="1 1 100%">
      {hasMarkets ? (
        <>
          <div className={CLASSES.macroSection} style={STYLES.sectionSpaced}>
            <div className={CLASSES.macroCaption} style={STYLES.macroCaption}>INDEXES</div>
            <div className={CLASSES.metricsRow}>{view.indexes.map((q, i) => <QuoteCard key={`idx-${i}`} quote={q} />)}</div>
          </div>
          <div className={CLASSES.macroSection} style={STYLES.sectionSpaced}>
            <div className={CLASSES.macroCaption} style={STYLES.macroCaption}>CRYPTO</div>
            <div className={CLASSES.metricsRow}>{view.crypto.map((q, i) => <QuoteCard key={`cry-${i}`} quote={q} />)}</div>
          </div>
        </>
      ) : null}
      <div className={CLASSES.macroSection} style={STYLES.sectionSpaced}>
        <div className={CLASSES.macroCaption} style={STYLES.macroCaption}>ENERGY + METALS + MACRO</div>
        <div className={CLASSES.metricsRow}>
          {view.metrics.map((m, i) => <MacroCard key={`${m.l}-${i}`} metric={m} />)}
        </div>
      </div>
      <div className={CLASSES.macroSection} style={STYLES.sectionTop}>
        <div className={CLASSES.macroCaption} style={STYLES.wtiCaption}>WTI 5-DAY</div>
        <div className={CLASSES.spark}>
          <SparkSvg values={view.wtiRecent} isGood={false} />
        </div>
      </div>
    </Panel>
  );
}
