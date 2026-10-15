import { CLASSES } from '../../classes';
import type { DigestCardItem } from '../../types';
import { DigestCard } from '../DigestCard';
import { DigestEmpty } from '../DigestEmpty';

export interface DigestGridProps {
  items: DigestCardItem[];
  now: () => number;
  onOpen: (id: string) => void;
  onRate: (id: string, rating: number) => void;
}

export function DigestGrid({ items, now, onOpen, onRate }: DigestGridProps) {
  return (
    <div className={CLASSES.grid} role="list">
      {items.length === 0
        ? <DigestEmpty />
        : items.map((a) => <DigestCard key={a.id} article={a} now={now} onOpen={onOpen} onRate={onRate} />)}
    </div>
  );
}
