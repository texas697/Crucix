import type { CSSProperties, ReactNode } from 'react';
import { CLASSES } from '../../classes';

export interface EconRowProps {
  label: ReactNode;
  value: ReactNode;
  title?: string;
  valueId?: string;
  valueStyle?: CSSProperties;
}

export function EconRow({ label, value, title, valueId, valueStyle }: EconRowProps) {
  return (
    <div className={CLASSES.econRow} title={title}>
      <span className={CLASSES.econLabel}>{label}</span>
      <span className={CLASSES.econValue} id={valueId} style={valueStyle}>{value}</span>
    </div>
  );
}
