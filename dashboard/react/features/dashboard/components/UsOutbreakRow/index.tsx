import Box from '@mui/material/Box';
import { safeExternalUrl } from '../../../../shared/safeUrl';
import { CLASSES } from '../../classes';
import { asText, type Rec } from '../../coerce';
import { relTime } from '../../format';
import { ROW_STYLES } from '../../styles';

export interface UsOutbreakRowProps {
  investigation: Rec;
}

export function UsOutbreakRow({ investigation: n }: UsOutbreakRowProps) {
  const href = safeExternalUrl(n.url) ?? undefined;
  return (
    <Box component="a" className={CLASSES.hwRow} sx={ROW_STYLES.hwRow} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener' : undefined}>
      <Box component="span" className={CLASSES.hwMain} sx={ROW_STYLES.hwMain}>
        <Box component="span" className={CLASSES.hwTitle} sx={ROW_STYLES.hwTitle}>{asText(n.title)}</Box>
        <Box component="span" className={CLASSES.hwSub} sx={ROW_STYLES.hwSub}>US multistate {'·'} {relTime(asText(n.date)) || ''}</Box>
      </Box>
    </Box>
  );
}
