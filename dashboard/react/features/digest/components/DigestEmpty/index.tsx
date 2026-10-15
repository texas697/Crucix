import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export function DigestEmpty() {
  return (
    <div className={CLASSES.empty} style={STYLES.empty}>
      NOTHING HERE YET.<br /><br />The library fills as the digest ingests feeds (every 30 minutes). Try ALL, or come back shortly.
    </div>
  );
}
