import { num, type Rec } from '../../coerce';
import { EconRow } from '../EconRow';

export interface TiangongRowProps {
  station: Rec;
}

export function TiangongRow({ station: c }: TiangongRowProps) {
  const title = 'CSS (TIANHE) · Tiangong' + (c.period ? ` · ${num(c.period).toFixed(1)} min orbit` : '');
  const value = `${c.alt != null ? `${num(c.alt)} km` : '--'}`
    + `${c.lat != null ? ` · ${num(c.lat).toFixed(1)}°, ${num(c.lon).toFixed(1)}°` : ''}`;
  return <EconRow label="Tiangong" value={value} title={title} valueId="cssLive" />;
}
