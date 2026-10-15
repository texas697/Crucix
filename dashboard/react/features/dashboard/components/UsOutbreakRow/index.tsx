import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { asText, type Rec } from '../../coerce';
import { relTime } from '../../format';

export interface UsOutbreakRowProps {
  investigation: Rec;
}

export function UsOutbreakRow({ investigation: n }: UsOutbreakRowProps) {
  const href = safeExternalUrl(n.url) ?? undefined;
  return (
    <a className={CLASSES.hwRow} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener' : undefined}>
      <span className={CLASSES.hwMain}>
        <span className={CLASSES.hwTitle}>{asText(n.title)}</span>
        <span className={CLASSES.hwSub}>US multistate {'·'} {relTime(asText(n.date)) || ''}</span>
      </span>
    </a>
  );
}
