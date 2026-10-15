import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import type { DigestTaste as DigestTasteValue } from '../../types';

export interface DigestTasteProps {
  taste: DigestTasteValue;
}

export function DigestTaste({ taste }: DigestTasteProps) {
  if (taste.likes.length === 0 && taste.dislikes.length === 0) return null;
  return (
    <div className={CLASSES.taste}>
      <span className={CLASSES.tasteLabel}>YOUR TASTE:</span>
      {taste.likes.map((t) => <b key={`like:${t}`} className={CLASSES.tasteLike}>+{t}</b>)}
      {taste.dislikes.map((t) => <span key={`dislike:${t}`} className={CLASSES.tasteDislike} style={STYLES.tasteDislike}>−{t}</span>)}
    </div>
  );
}
