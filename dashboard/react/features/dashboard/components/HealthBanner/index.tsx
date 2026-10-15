import { asText, type Rec } from '../../coerce';
import { riskMax } from '../HealthWatchPanel/health';
import { RISK_STYLES } from '../HealthWatchPanel/styles';
import { StatusBanner } from '../StatusBanner';

export interface HealthBannerProps {
  error: string;
  worst: Rec | undefined;
  hasOutbreaks: boolean;
}

export function HealthBanner({ error, worst, hasOutbreaks }: HealthBannerProps) {
  const worstRisk = worst ? riskMax(worst.risk) : '';
  if (error) return <StatusBanner tone="anom">{'⚠'} {error}</StatusBanner>;
  if (worst) {
    return (
      <StatusBanner tone="anom" sx={RISK_STYLES[worstRisk.toLowerCase()]}>
        {'⚠'} WHO risk {worstRisk} {'·'}{' '}
        {asText(worst.disease).replace(/ disease caused by /i, ' · ')}
      </StatusBanner>
    );
  }
  if (hasOutbreaks) return <StatusBanner tone="ok">{'●'} No high-risk WHO assessment</StatusBanner>;
  return null;
}
