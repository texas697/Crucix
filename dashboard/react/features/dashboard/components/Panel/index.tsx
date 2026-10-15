import { useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import { CLASSES } from '../../classes';

export interface PanelProps {
  id: string;
  title: ReactNode;
  badge?: ReactNode;
  headExtra?: ReactNode;
  isPadSm?: boolean;
  flex?: string;
  children: ReactNode;
}

export function Panel({ id, title, badge, headExtra, isPadSm, flex, children }: PanelProps) {
  const style = useMemo(() => (flex ? { flex } : undefined), [flex]);
  return (
    <div className={CLASSES.card} id={id} style={style}>
      <div className={CLASSES.cardHead}>
        <h3 className={CLASSES.cardTitle}>{title}</h3>
        <div className={CLASSES.cardHeadRight}>
          {badge ? <span className={CLASSES.badge}>{badge}</span> : null}
          {headExtra}
        </div>
      </div>
      <div className={clsx(CLASSES.cardBody, isPadSm && CLASSES.cardBodyPadSm)}>{children}</div>
    </div>
  );
}
