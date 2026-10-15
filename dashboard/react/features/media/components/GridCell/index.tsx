import { CLASSES } from '../../classes';
import { useGridCell } from '../../hooks/useGridCell';
import type { MediaChannel } from '../../types';

export interface GridCellProps {
  channel: MediaChannel;
}

export function GridCell({ channel }: GridCellProps) {
  const videoRef = useGridCell({ channel });
  return (
    <div className={CLASSES.cell}>
      <video ref={videoRef} data-src={channel.hls} muted playsInline />
      <span className={CLASSES.cellCaption}>{channel.name}</span>
    </div>
  );
}
