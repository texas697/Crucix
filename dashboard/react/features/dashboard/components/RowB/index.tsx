import type { PanelDataProps, QuakeItem, TrackItem } from '../../types';
import { DisastersPanel } from '../DisastersPanel';
import { OutagesPanel } from '../OutagesPanel';
import { SignalCore } from '../SignalCore';
import { SweepDelta } from '../SweepDelta';

export interface RowBProps extends PanelDataProps {
  quakes?: QuakeItem[];
  tracks?: TrackItem[] | null;
}

export function RowB({ data, t, quakes, tracks }: RowBProps) {
  return (
    <>
      <SignalCore data={data} t={t} tracks={tracks} />
      <SweepDelta data={data} t={t} />
      <DisastersPanel data={data} t={t} quakes={quakes} />
      <OutagesPanel data={data} t={t} />
    </>
  );
}
