import { CLASSES } from '../../classes';
import type { SignalGuideItem } from '../../types';

export interface SignalGuideCardProps {
  item: SignalGuideItem;
}

export function SignalGuideCard({ item }: SignalGuideCardProps) {
  return (
    <div className={CLASSES.guideCard}>
      <div className={CLASSES.guideTerm}>
        <strong className={CLASSES.guideTermName}>{item.term}</strong>
        <span className={CLASSES.guideTag}>{item.category}</span>
      </div>
      <div className={CLASSES.guideLine}><span className={CLASSES.guideLabel}>Meaning</span>{item.meaning}</div>
      <div className={CLASSES.guideLine}><span className={CLASSES.guideLabel}>Why it matters</span>{item.matters}</div>
      <div className={CLASSES.guideLine}><span className={CLASSES.guideLabel}>Not proof of</span>{item.notMeaning}</div>
      <div className={CLASSES.guideLine}><span className={CLASSES.guideLabel}>Example</span>{item.example}</div>
    </div>
  );
}
