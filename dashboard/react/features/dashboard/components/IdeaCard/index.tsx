import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES, IDEA_TYPE_CLASSES } from '../../classes';
import { str, type Rec } from '../../coerce';
import { withSx } from '../../sx';
import { IDEA_TYPE_STYLES, STYLES } from './styles';

export interface IdeaCardProps {
  idea: Rec;
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const type = str(idea.type);
  const typeKey = type.toLowerCase();
  return (
    <Paper component="article" className={CLASSES.ideaCard} sx={STYLES.ideaCard}>
      <Box className={CLASSES.ideaMeta} sx={STYLES.ideaMeta}>
        <Box component="span" className={clsx(CLASSES.ideaType, IDEA_TYPE_CLASSES[typeKey])} sx={withSx(STYLES.ideaType, IDEA_TYPE_STYLES[typeKey])}>
          {type.toUpperCase()}
        </Box>
        {idea.ticker ? <Box component="span" className={CLASSES.ideaTicker} sx={STYLES.ideaTicker}>{str(idea.ticker)}</Box> : null}
        {idea.horizon ? <Box component="span" className={CLASSES.ideaHorizon} sx={STYLES.ideaHorizon}>{str(idea.horizon)}</Box> : null}
        <Box component="span" className={CLASSES.ideaConfidence} sx={STYLES.ideaConfidence}>{str(idea.confidence)} confidence</Box>
      </Box>
      <Typography className={CLASSES.ideaTitle} sx={STYLES.ideaTitle}>{str(idea.title)}</Typography>
      <Typography className={CLASSES.ideaText} sx={STYLES.ideaText}>{str(idea.text) || str(idea.rationale)}</Typography>
      {idea.risk ? <Box className={CLASSES.ideaRisk} sx={STYLES.ideaRisk}>Risk {'·'} {str(idea.risk)}</Box> : null}
    </Paper>
  );
}
