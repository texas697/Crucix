import Box from '@mui/material/Box';
import clsx from 'clsx';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES, HW_LEVEL_CLASSES } from '../../classes';
import { asStrArr, asText, num, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { ROW_STYLES } from '../../styles';
import { withSx } from '../../sx';
import { CDC_LEVEL_LABEL } from '../HealthWatchPanel/health';
import { HW_LEVEL_STYLES, STYLES } from './styles';

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
    <Box component="a" className={CLASSES.hwRow} sx={ROW_STYLES.hwRow} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener' : undefined} title={title}>
      <Box component="span" className={CLASSES.hwMain} sx={ROW_STYLES.hwMain}>
        <Box component="span" className={CLASSES.hwTitle} sx={ROW_STYLES.hwTitle}>{asText(n.name)}</Box>
        <Box component="span" className={CLASSES.hwSub} sx={ROW_STYLES.hwSub}>{destinations} {'·'} {relTime(asText(n.date)) || ''}</Box>
      </Box>
      <Box component="span" className={clsx(CLASSES.hwLevel, HW_LEVEL_CLASSES[String(level)])} sx={withSx(STYLES.hwLevel, HW_LEVEL_STYLES[String(level)])}>
        L{level}
      </Box>
    </Box>
  );
}
