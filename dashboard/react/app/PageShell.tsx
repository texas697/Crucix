import type { ReactNode } from 'react';
import type { Surface } from './surfaces';
import '../styles/tokens.css';
import '../styles/shell.css';
import '../styles/dashboard.css';
import '../styles/reader.css';
import '../styles/media.css';
import '../styles/digest.css';

export interface PageShellProps {
  surface: Surface;
  children?: ReactNode;
}

// Host wrapper every React surface renders into. The single `.crucix-surface` class keeps styles
// scoped so dashboard, digest, media and login can share the document; `data-surface` lets a
// surface target itself (see the login overrides in tokens.css) and aids test/debug selection.
export function PageShell({ surface, children }: PageShellProps) {
  return (
    <div className="crucix-surface" data-surface={surface}>
      {children}
    </div>
  );
}
