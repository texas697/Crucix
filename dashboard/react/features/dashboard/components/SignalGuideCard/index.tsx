import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { CLASSES } from '../../classes';
import type { SignalGuideItem } from '../../types';
import { STYLES } from './styles';

export interface SignalGuideCardProps {
  item: SignalGuideItem;
}

function GuideLine({ label, text }: { label: string; text: string }) {
  return (
    <Box className={CLASSES.guideLine} sx={STYLES.line}>
      <Box component="span" className={CLASSES.guideLabel} sx={STYLES.label}>{label}</Box>
      {text}
    </Box>
  );
}

export function SignalGuideCard({ item }: SignalGuideCardProps) {
  return (
    <Paper className={CLASSES.guideCard} sx={STYLES.card}>
      <Box className={CLASSES.guideTerm} sx={STYLES.term}>
        <Box component="strong" className={CLASSES.guideTermName} sx={STYLES.termName}>{item.term}</Box>
        <Box component="span" className={CLASSES.guideTag} sx={STYLES.tag}>{item.category}</Box>
      </Box>
      <GuideLine label="Meaning" text={item.meaning} />
      <GuideLine label="Why it matters" text={item.matters} />
      <GuideLine label="Not proof of" text={item.notMeaning} />
      <GuideLine label="Example" text={item.example} />
    </Paper>
  );
}
