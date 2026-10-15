import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import { CLASSES } from '../../classes';

export interface StatusBannerProps {
  tone: 'ok' | 'anom';
  children: ReactNode;
  note?: ReactNode;
  style?: CSSProperties;
}

export function StatusBanner({ tone, children, note, style }: StatusBannerProps) {
  return (
    <div className={clsx(CLASSES.statusBanner, tone === 'ok' ? CLASSES.statusBannerOk : CLASSES.statusBannerAnom)} style={style}>
      {children}
      {note}
    </div>
  );
}
