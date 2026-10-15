import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { TONE_STYLES } from '../../styles';
import { HEALTH_RISK_COL, riskMax, riskTitle } from '../HealthWatchPanel/health';
import { STYLES, riskTagSx } from './styles';

export interface RiskTagProps {
  risk: unknown;
}

export function RiskTag({ risk }: RiskTagProps) {
  const max = riskMax(risk);
  const color = HEALTH_RISK_COL[max.toLowerCase()];
  const toneSx = useMemo(() => riskTagSx(color), [color]);
  if (!risk) {
    return (
      <Box component="span" className={CLASSES.hwRisk} sx={[STYLES.hwRisk, TONE_STYLES.dimText]} title="WHO has not published a risk level for this event">
        unrated
      </Box>
    );
  }
  return <Box component="span" className={CLASSES.hwRisk} sx={toneSx} title={riskTitle(risk)}>{max}</Box>;
}
