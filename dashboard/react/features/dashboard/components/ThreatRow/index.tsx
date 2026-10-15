import { useMemo } from 'react';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { ThreatRegion } from '../ThreatPanel/threat';

export interface ThreatRowProps {
  threat: ThreatRegion;
}

export function ThreatRow({ threat: x }: ThreatRowProps) {
  const nd = x.parts.reduce((s, p) => s + p.n, 0);
  const dotStyle = useMemo(() => ({ background: x.color }), [x.color]);
  const levelStyle = useMemo(() => ({ color: x.color }), [x.color]);
  return (
    <div className={CLASSES.threatRow} title={`${x.tip} ${'·'} hover for the breakdown`}>
      <span className={CLASSES.threatDot} style={dotStyle} />
      <span className={CLASSES.threatName}>{x.label}</span>
      <span className={CLASSES.threatMeta}>
        {x.severe.toLocaleString()} severe
        {nd ? <span className={CLASSES.threatDisruption} title={`${nd} disruption signal${nd === 1 ? '' : 's'}`}>{'⚠'} {nd}</span> : null}
      </span>
      <span className={CLASSES.threatLevel} style={levelStyle}>
        {x.level} <span className={CLASSES.threatScore} style={STYLES.scoreMuted}>{x.score}</span>
      </span>
    </div>
  );
}
