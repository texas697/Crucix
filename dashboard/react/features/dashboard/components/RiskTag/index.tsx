import { useMemo } from 'react';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { HEALTH_RISK_COL, riskMax, riskTitle } from '../HealthWatchPanel/health';

export interface RiskTagProps {
  risk: unknown;
}

export function RiskTag({ risk }: RiskTagProps) {
  const max = riskMax(risk);
  const style = useMemo(() => ({ color: HEALTH_RISK_COL[max.toLowerCase()] || 'var(--text-2)' }), [max]);
  if (!risk) {
    return (
      <span className={CLASSES.hwRisk} style={STYLES.dimText} title="WHO has not published a risk level for this event">unrated</span>
    );
  }
  return <span className={CLASSES.hwRisk} style={style} title={riskTitle(risk)}>{max}</span>;
}
