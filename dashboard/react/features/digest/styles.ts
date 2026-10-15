import type { CSSProperties } from 'react';

export const STYLES = {
  tasteDislike: { color: 'var(--danger)' },
  empty: { gridColumn: '1 / -1' },
  cardTags: { display: 'flex', gap: 4, flexWrap: 'wrap' },
} satisfies Record<string, CSSProperties>;
