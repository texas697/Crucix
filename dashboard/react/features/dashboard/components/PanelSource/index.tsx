import type { CSSProperties, ReactNode } from 'react';
import { CLASSES } from '../../classes';

export interface PanelSourceProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function PanelSource({ children, style }: PanelSourceProps) {
  return <div className={CLASSES.panelSource} style={style}>{children}</div>;
}
