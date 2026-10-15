import { CLASSES } from '../../classes';

export interface DigestHeroProps {
  status: string;
}

export function DigestHero({ status }: DigestHeroProps) {
  return (
    <div className={CLASSES.hero}>
      <div className={CLASSES.heroText}>
        <h1 className={CLASSES.heroTitle}>Readers Digest</h1>
        <p className={CLASSES.heroLead}>Long-form analysis and reporting from think tanks and the policy press, written up for fast reading. Rate pieces and the feed learns what you care about. Open any piece for the AI write-up and a cited deep dive on your own key.</p>
      </div>
      <div className={CLASSES.status}>{status}</div>
    </div>
  );
}
