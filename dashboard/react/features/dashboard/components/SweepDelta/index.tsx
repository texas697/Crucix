import Box from '@mui/material/Box';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { asRec, asText, num } from '../../coerce';
import { makeLabel } from '../../label';
import { withSx } from '../../sx';
import type { PanelDataProps } from '../../types';
import { Panel } from '../Panel';
import { STYLES as PANEL_STYLES } from '../Panel/styles';
import { renderDeltaRows } from './renders/renderDeltaRows';
import { STYLES } from './styles';

const DIRECTION_CLASS: Record<string, string> = { 'risk-off': CLASSES.badgeUp, 'risk-on': CLASSES.badgeDown };
const DIRECTION_STYLE = { 'risk-off': PANEL_STYLES.badgeUp, 'risk-on': PANEL_STYLES.badgeDown } as const;

function DeltaStat({ label, value }: { label: string; value: number }) {
  return (
    <Box className={CLASSES.deltaStat} sx={STYLES.deltaStat}>
      <Box component="span" className={CLASSES.deltaStatKey} sx={STYLES.deltaStatKey}>{label}</Box>
      <Box component="span" className={CLASSES.deltaStatValue} sx={STYLES.deltaStatValue}>{value}</Box>
    </Box>
  );
}

export function SweepDelta({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const delta = asRec(data.delta);
  const summary = asRec(delta.summary);
  const hasDelta = num(summary.totalChanges) > 0;
  const direction = asText(summary.direction);
  const dirText = direction ? tr(`delta.${direction}`, direction.toUpperCase()) : tr('delta.baseline', 'Baseline');
  const directionSx = DIRECTION_STYLE[direction as keyof typeof DIRECTION_STYLE];

  return (
    <Panel
      id="pDelta"
      title={tr('panels.sweepDelta', 'Sweep delta')}
      headExtra={(
        <Box component="span" className={clsx(CLASSES.badge, DIRECTION_CLASS[direction])} sx={withSx(PANEL_STYLES.badge, directionSx)}>
          {dirText}
        </Box>
      )}
      flex="1 1 240px"
    >
      {hasDelta ? (
        <Box className={CLASSES.deltaStats} sx={STYLES.deltaStats}>
          <DeltaStat label={tr('delta.changes', 'Changes')} value={num(summary.totalChanges)} />
          <DeltaStat label={tr('delta.critical', 'Critical')} value={num(summary.criticalChanges)} />
          <DeltaStat label={tr('delta.new', 'New')} value={num(asRec(summary.signalBreakdown).new)} />
        </Box>
      ) : null}
      <Box className={CLASSES.deltaList} sx={STYLES.deltaList}>
        {hasDelta ? renderDeltaRows(asRec(delta.signals)) : (
          <Box className={CLASSES.deltaEmpty} sx={STYLES.deltaEmpty}>
            {tr('delta.noChanges', 'No changes since last sweep')}
          </Box>
        )}
      </Box>
    </Panel>
  );
}
