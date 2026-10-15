import type { ReactNode } from 'react';

// Layout primitives for the dashboard grid, matching the legacy markup exactly so the ported CSS
// applies: `.row.row-* > .col-card > (.card-head + .card-body)` (jarvis.html 723-752, cardHtml 1294).

export interface PanelProps {
  /** Legacy element id (e.g. "pSensor") used by CSS and tests. */
  id: string;
  title: ReactNode;
  badge?: ReactNode;
  headExtra?: ReactNode;
  bodyClass?: string;
  /** Inline flex sizing, e.g. "1 1 260px" (matches the legacy column widths). */
  flex?: string;
  children: ReactNode;
}

export function Panel({ id, title, badge, headExtra, bodyClass, flex, children }: PanelProps) {
  return (
    <div className="col-card" id={id} style={flex ? { flex } : undefined}>
      <div className="card-head">
        <h3>{title}</h3>
        <div className="card-head-right">
          {badge ? <span className="badge">{badge}</span> : null}
          {headExtra}
        </div>
      </div>
      <div className={`card-body${bodyClass ? ` ${bodyClass}` : ''}`}>{children}</div>
    </div>
  );
}

export function Row({ name, children }: { name: 'a' | 'b' | 'c' | 'd' | 'e'; children: ReactNode }) {
  return <div className={`row row-${name}`}>{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
