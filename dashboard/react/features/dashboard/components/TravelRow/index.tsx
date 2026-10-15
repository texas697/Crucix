import clsx from 'clsx';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES, HW_LEVEL_CLASSES } from '../../classes';
import { asStrArr, asText, num, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { CDC_LEVEL_LABEL } from '../HealthWatchPanel/health';

export interface TravelRowProps {
  notice: Rec;
}

export function TravelRow({ notice: n }: TravelRowProps) {
  const href = safeExternalUrl(n.url) ?? undefined;
  const level = num(n.level);
  const countries = asStrArr(n.countries);
  const title = `CDC Level ${level}: ${CDC_LEVEL_LABEL[String(level)] || ''}`
    + (countries.length ? ` · ${countries.slice(0, 12).join(', ')}${countries.length > 12 ? ' …' : ''}` : '');
  const destinations = num(n.n) > 1 ? `${num(n.n)} destinations` : countries[0] || '';
  return (
    <a className={CLASSES.hwRow} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener' : undefined} title={title}>
      <span className={CLASSES.hwMain}>
        <span className={CLASSES.hwTitle}>{asText(n.name)}</span>
        <span className={CLASSES.hwSub}>{destinations} {'·'} {relTime(asText(n.date)) || ''}</span>
      </span>
      <span className={clsx(CLASSES.hwLevel, HW_LEVEL_CLASSES[String(level)])}>L{level}</span>
    </a>
  );
}
