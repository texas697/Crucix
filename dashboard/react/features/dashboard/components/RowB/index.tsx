import type { PanelDataProps, QuakeItem } from '../../types';
import { DisastersPanel } from '../DisastersPanel';
import { OutagesPanel } from '../OutagesPanel';
import { SignalCore } from '../SignalCore';
import { SweepDelta } from '../SweepDelta';

export interface RowBProps extends PanelDataProps {
  quakes?: QuakeItem[];
}

export function RowB({ data, t, quakes }: RowBProps) {
  return (
    <>
      <SignalCore data={data} t={t} />
      <SweepDelta data={data} t={t} />
      <DisastersPanel data={data} t={t} quakes={quakes} />
      <OutagesPanel data={data} t={t} />
    </>
  );
}
