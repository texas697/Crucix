import type { ReactNode } from 'react';
import clsx from 'clsx';
import { CLASSES, ROW_CLASSES } from '../../classes';
import type { RowName } from '../../types';

export interface PanelRowProps {
  name: RowName;
  children: ReactNode;
}

export function PanelRow({ name, children }: PanelRowProps) {
  return <div className={clsx(CLASSES.row, ROW_CLASSES[name])}>{children}</div>;
}
