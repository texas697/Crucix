import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { makeLabel } from '../../label';
import type { PanelDataProps } from '../../types';
import { MacroCard } from '../MacroCard';
import { Panel } from '../Panel';
import { QuoteCard } from '../QuoteCard';
import { SparkSvg } from '../SparkSvg';
import { marketsView } from './metrics';
import { STYLES } from './styles';

export function MarketsPanel({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const view = marketsView(data);
  const hasMarkets = view.indexes.length > 0 || view.crypto.length > 0;
  return (
    <Panel id="pMarkets" title={tr('panels.macroMarkets', 'Macro + markets')} badge={view.isLive ? 'Live' : 'Delayed'} flex="1 1 100%">
      {hasMarkets ? (
        <>
          <Box className={CLASSES.macroSection} sx={STYLES.macroSection}>
            <Box className={CLASSES.macroCaption} sx={STYLES.macroCaption}>INDEXES</Box>
            <Box className={CLASSES.metricsRow} sx={STYLES.metricsRow}>{view.indexes.map((q, i) => <QuoteCard key={`idx-${i}`} quote={q} />)}</Box>
          </Box>
          <Box className={CLASSES.macroSection} sx={STYLES.macroSection}>
            <Box className={CLASSES.macroCaption} sx={STYLES.macroCaption}>CRYPTO</Box>
            <Box className={CLASSES.metricsRow} sx={STYLES.metricsRow}>{view.crypto.map((q, i) => <QuoteCard key={`cry-${i}`} quote={q} />)}</Box>
          </Box>
        </>
      ) : null}
      <Box className={CLASSES.macroSection} sx={STYLES.macroSection}>
        <Box className={CLASSES.macroCaption} sx={STYLES.macroCaption}>ENERGY + METALS + MACRO</Box>
        <Box className={CLASSES.metricsRow} sx={STYLES.metricsRow}>
          {view.metrics.map((m, i) => <MacroCard key={`${m.l}-${i}`} metric={m} />)}
        </Box>
      </Box>
      <Box className={CLASSES.macroSection} sx={STYLES.macroSectionTop}>
        <Box className={CLASSES.macroCaption} sx={STYLES.wtiCaption}>WTI 5-DAY</Box>
        <Box className={CLASSES.spark} sx={STYLES.spark}>
          <SparkSvg values={view.wtiRecent} isGood={false} />
        </Box>
      </Box>
    </Panel>
  );
}
