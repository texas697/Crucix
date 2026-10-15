import type { CSSProperties } from 'react';

export const STYLES = {
  overlayActions: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  videoShown: { display: 'block' },
  videoHidden: { display: 'none' },
} satisfies Record<string, CSSProperties>;
