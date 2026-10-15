import { CLASSES } from '../../classes';
import { useGuideDialog } from '../../hooks/useGuideDialog';
import { SignalGuideCard } from '../SignalGuideCard';
import { SIGNAL_GUIDE_ITEMS } from './items';

export interface SignalGuideProps {
  open: boolean;
  onClose: () => void;
}

const TITLE_ID = 'glossaryTitle';

export function SignalGuide({ open, onClose }: SignalGuideProps) {
  const { panelRef, onBackdropClick } = useGuideDialog({ isOpen: open, onClose });
  if (!open) return null;
  return (
    <div className={CLASSES.guideOverlay} id="glossaryOverlay" data-surface="signal-guide" onClick={onBackdropClick}>
      <div className={CLASSES.guidePanel} role="dialog" aria-modal="true" aria-labelledby={TITLE_ID} ref={panelRef} tabIndex={-1}>
        <div className={CLASSES.guideHead}>
          <div className={CLASSES.guideHeadText}>
            <div className={CLASSES.guideKicker}>Signal Guide</div>
            <div className={CLASSES.guideTitle} id={TITLE_ID}>What the signals actually mean</div>
            <div className={CLASSES.guideSub}>Plain-English interpretation, why it matters, and what you should not infer from it.</div>
          </div>
          <button className={CLASSES.guideClose} type="button" onClick={onClose} aria-label="Close signal guide">&times;</button>
        </div>
        <div className={CLASSES.guideBody} id="glossaryBody">
          {SIGNAL_GUIDE_ITEMS.map((item) => <SignalGuideCard key={item.term} item={item} />)}
        </div>
        <div className={CLASSES.guideFoot}>Treat these as interpretation guides, not conclusions. Stronger judgments should come from corroboration across multiple layers, not from a single signal viewed in isolation.</div>
      </div>
    </div>
  );
}

export { SIGNAL_GUIDE_ITEMS as signalGuideItems } from './items';
