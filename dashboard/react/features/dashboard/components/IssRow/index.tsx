import { num, str, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { STYLES } from '../../styles';
import { EconRow } from '../EconRow';

export interface IssRowProps {
  iss: Rec;
}

export function IssRow({ iss }: IssRowProps) {
  const title = 'ISS (ZARYA) · '
    + (iss.period ? `${num(iss.period).toFixed(1)} min orbit · ` : '')
    + (iss.inclination != null ? `${num(iss.inclination).toFixed(1)}° inclination` : '')
    + (iss.epoch ? ` · elements ${relTime(str(iss.epoch))}` : '');
  const value = `${iss.altitude != null ? `${num(iss.altitude)} km` : '--'}`
    + `${iss.lat != null ? ` · ${num(iss.lat).toFixed(1)}°, ${num(iss.lon).toFixed(1)}°` : ''}`;
  return <EconRow label="ISS" value={value} title={title} valueId="issLive" valueStyle={STYLES.accent} />;
}
