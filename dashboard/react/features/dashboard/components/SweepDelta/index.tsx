import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { asRec, asText, num } from '../../coerce';
import { makeLabel } from '../../label';
import { STYLES } from '../../styles';
import type { PanelDataProps } from '../../types';
import { Panel } from '../Panel';
import { renderDeltaRows } from './rows';

const DIRECTION_CLASS: Record<string, string> = { 'risk-off': CLASSES.badgeUp, 'risk-on': CLASSES.badgeDown };

export function SweepDelta({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const delta = asRec(data.delta);
  const summary = asRec(delta.summary);
  const hasDelta = num(summary.totalChanges) > 0;
  const direction = asText(summary.direction);
  const dirText = direction ? tr(`delta.${direction}`, direction.toUpperCase()) : tr('delta.baseline', 'Baseline');

  return (
    <Panel
      id="pDelta"
      title={tr('panels.sweepDelta', 'Sweep delta')}
      headExtra={<span className={clsx(CLASSES.badge, DIRECTION_CLASS[direction])}>{dirText}</span>}
      flex="1 1 240px"
    >
      {hasDelta ? (
        <div className={CLASSES.deltaStats}>
          <div className={CLASSES.deltaStat}>
            <span className={CLASSES.deltaStatKey}>{tr('delta.changes', 'Changes')}</span>
            <span className={CLASSES.deltaStatValue}>{num(summary.totalChanges)}</span>
          </div>
          <div className={CLASSES.deltaStat}>
            <span className={CLASSES.deltaStatKey}>{tr('delta.critical', 'Critical')}</span>
            <span className={CLASSES.deltaStatValue}>{num(summary.criticalChanges)}</span>
          </div>
          <div className={CLASSES.deltaStat}>
            <span className={CLASSES.deltaStatKey}>{tr('delta.new', 'New')}</span>
            <span className={CLASSES.deltaStatValue}>{num(asRec(summary.signalBreakdown).new)}</span>
          </div>
        </div>
      ) : null}
      <div className={CLASSES.deltaList}>
        {hasDelta ? renderDeltaRows(asRec(delta.signals)) : (
          <div className={CLASSES.deltaEmpty} style={STYLES.emptyBlock}>
            {tr('delta.noChanges', 'No changes since last sweep')}
          </div>
        )}
      </div>
    </Panel>
  );
}
