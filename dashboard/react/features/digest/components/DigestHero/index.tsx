import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from './styles';

export interface DigestHeroProps {
  status: string;
}

export function DigestHero({ status }: DigestHeroProps) {
  return (
    <Stack direction="row" className={CLASSES.hero} sx={STYLES.hero}>
      <Box className={CLASSES.heroText}>
        <Typography component="h1" variant="h1" className={CLASSES.heroTitle} sx={STYLES.heroTitle}>Readers Digest</Typography>
        <Typography component="p" className={CLASSES.heroLead} sx={STYLES.heroLead}>
          Long-form analysis and reporting from think tanks and the policy press, written up for fast reading. Rate pieces and the feed learns what you care about. Open any piece for the AI write-up and a cited deep dive on your own key.
        </Typography>
      </Box>
      <Typography component="div" className={CLASSES.status} sx={STYLES.status}>{status}</Typography>
    </Stack>
  );
}
