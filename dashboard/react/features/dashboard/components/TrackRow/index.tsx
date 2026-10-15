import { useMemo } from 'react';
import { CLASSES } from '../../classes';
import { str } from '../../coerce';
import { getAge } from '../../format';
import type { TrackItem } from '../../types';

export interface TrackRowProps {
  track: TrackItem;
}

const TRACK_TYPE_COLOR: Record<string, string> = {
  fpv: '#f2c879', uav: '#f59a5e', missile: '#ff6b74', kab: '#b48cff', shahed: '#ff6b74',
};

export function TrackRow({ track: x }: TrackRowProps) {
  const type = str(x.type) || 'track';
  const col = TRACK_TYPE_COLOR[type.toLowerCase()] || '#ff9e6b';
  const typeStyle = useMemo(() => ({ color: col, borderColor: `${col}66` }), [col]);
  const age = x.updatedAt ? getAge(x.updatedAt) : '';
  return (
    <div className={CLASSES.trackRow}>
      <span className={CLASSES.trackType} style={typeStyle}>{type.toUpperCase()}</span>
      <span className={CLASSES.trackLocation}>{str(x.locality)}{x.locality && x.region ? ', ' : ''}{str(x.region)}</span>
      <span className={CLASSES.trackMeta}>{x.confidence || ''} {'·'} {x.sourceCount || 1} src {'·'} {age}</span>
    </div>
  );
}
