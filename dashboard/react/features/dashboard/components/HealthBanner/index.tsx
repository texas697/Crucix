import { useMemo } from 'react';
import { asText, type Rec } from '../../coerce';
import { HEALTH_RISK_CSS, riskMax } from '../HealthWatchPanel/health';
import { StatusBanner } from '../StatusBanner';

export interface HealthBannerProps {
  error: string;
  worst: Rec | undefined;
  hasOutbreaks: boolean;
}

export function HealthBanner({ error, worst, hasOutbreaks }: HealthBannerProps) {
  const worstRisk = worst ? riskMax(worst.risk) : '';
  const style = useMemo(() => ({ color: HEALTH_RISK_CSS[worstRisk.toLowerCase()] }), [worstRisk]);
  if (error) return <StatusBanner tone="anom">{'⚠'} {error}</StatusBanner>;
  if (worst) {
    return (
      <StatusBanner tone="anom" style={style}>
        {'⚠'} WHO risk {worstRisk} {'·'}{' '}
        {asText(worst.disease).replace(/ disease caused by /i, ' · ')}
      </StatusBanner>
    );
  }
  if (hasOutbreaks) return <StatusBanner tone="ok">{'●'} No high-risk WHO assessment</StatusBanner>;
  return null;
}
