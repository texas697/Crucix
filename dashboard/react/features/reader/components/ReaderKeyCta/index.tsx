import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface ReaderKeyCtaProps {
  what: string;
  onOpenSettings: () => void;
}

export function ReaderKeyCta({ what, onOpenSettings }: ReaderKeyCtaProps) {
  return (
    <Box className={CLASSES.cta} sx={STYLES.cta}>
      <Box className={CLASSES.ctaBig} sx={STYLES.ctaBig}>⚡ ADD YOUR AI KEY</Box>
      <Typography className={CLASSES.ctaText} sx={STYLES.ctaText} component="p">
        {what} runs on your own LLM key. Enter it once and it is used only for your requests.
      </Typography>
      <Button className={CLASSES.ctaButton} sx={[STYLES.button, STYLES.buttonPrimary]} onClick={onOpenSettings}>
        Enter API key
      </Button>
    </Box>
  );
}
