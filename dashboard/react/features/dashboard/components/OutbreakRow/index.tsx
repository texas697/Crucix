import Box from '@mui/material/Box';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { asStrArr, asText, num, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { ROW_STYLES } from '../../styles';
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
    <Box component="a" className={CLASSES.hwRow} sx={ROW_STYLES.hwRow} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener' : undefined} title={asText(o.summary)}>
      <Box component="span" className={CLASSES.hwMain} sx={ROW_STYLES.hwMain}>
        <Box component="span" className={CLASSES.hwTitle} sx={ROW_STYLES.hwTitle}>{asText(o.disease)}</Box>
        <Box component="span" className={CLASSES.hwSub} sx={ROW_STYLES.hwSub}>
          {places} {'·'} {updates} notice{updates === 1 ? '' : 's'} {'·'}{' '}
          {relTime(last) || last.slice(0, 10)}
        </Box>
      </Box>
      <RiskTag risk={o.risk} />
    </Box>
  );
}
