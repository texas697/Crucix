import type { PanelDataProps } from '../../types';
import { NuclearWatch } from '../NuclearWatch';
import { RiskGauges } from '../RiskGauges';
import { SensorGrid } from '../SensorGrid';

export function LeftRail({ data, t }: PanelDataProps) {
  return (
    <>
      <SensorGrid data={data} t={t} />
      <NuclearWatch data={data} t={t} />
      <RiskGauges data={data} t={t} />
    </>
  );
}
