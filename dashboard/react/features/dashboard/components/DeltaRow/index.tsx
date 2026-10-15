import type { CSSProperties, ReactNode } from 'react';
import { CLASSES } from '../../classes';

export interface DeltaRowProps {
  dotColor: string;
  label: ReactNode;
  labelStyle?: CSSProperties;
  value?: ReactNode;
}

export function DeltaRow({ dotColor, label, labelStyle, value }: DeltaRowProps) {
  return (
    <div className={CLASSES.deltaRow}>
      <span className={CLASSES.deltaDot} style={{ background: dotColor }} />
      <span className={CLASSES.deltaLabel} style={labelStyle}>{label}</span>
      {value !== undefined ? <span className={CLASSES.deltaValue}>{value}</span> : null}
    </div>
  );
}
