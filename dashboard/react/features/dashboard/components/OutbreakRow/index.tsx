import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { asStrArr, asText, num, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { RiskTag } from '../RiskTag';

export interface OutbreakRowProps {
  outbreak: Rec;
}

export function OutbreakRow({ outbreak: o }: OutbreakRowProps) {
  const href = safeExternalUrl(o.url) ?? undefined;
  const updates = num(o.updates, 1);
  const places = asStrArr(o.places).join(', ') || 'Multi-country';
  const last = asText(o.last);
  return (
    <a className={CLASSES.hwRow} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener' : undefined} title={asText(o.summary)}>
      <span className={CLASSES.hwMain}>
        <span className={CLASSES.hwTitle}>{asText(o.disease)}</span>
        <span className={CLASSES.hwSub}>
          {places} {'·'} {updates} notice{updates === 1 ? '' : 's'} {'·'}{' '}
          {relTime(last) || last.slice(0, 10)}
        </span>
      </span>
      <RiskTag risk={o.risk} />
    </a>
  );
}
