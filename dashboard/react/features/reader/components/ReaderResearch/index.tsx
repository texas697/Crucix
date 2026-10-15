import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { renderMarkdown } from '../../../../shared/markdown';
import { CLASSES } from '../../classes';
import { STAGE_LABEL } from '../../consts';
import { STYLES } from '../../styles';
import type { ReaderAccess, ResearchState } from '../../types';
import { ago } from '../../utils';
import { ReaderKeyCta } from '../ReaderKeyCta';

export interface ReaderResearchProps {
  research: ResearchState | undefined;
  access: ReaderAccess;
  nowMs: number;
  onResearch: () => void;
  onOpenSettings: () => void;
}

function renderRunning(research: ResearchState) {
  const progress = research.progress ?? 5;
  return (
    <Box className={CLASSES.researchRunning}>
      <Box className={CLASSES.note} sx={STYLES.note}>{STAGE_LABEL[research.stage ?? ''] ?? 'Working…'}</Box>
      <LinearProgress className={CLASSES.progress} sx={STYLES.progress} variant="determinate" value={progress} />
      <Box className={CLASSES.note} sx={STYLES.note}>
        Usually 30–90 seconds. You can close this and come back; the result is saved to your account.
      </Box>
    </Box>
  );
}

export function ReaderResearch({ research, access, nowMs, onResearch, onOpenSettings }: ReaderResearchProps) {
  const { isAuthed, hasKey, hasTavily } = access;
  const isIdle = !research || research.state === 'none' || research.state === 'error';
  return (
    <Box className={CLASSES.section} sx={STYLES.section}>
      <Typography className={CLASSES.sectionTitle} variant="h6" component="h2">Read more about it</Typography>
      {research?.state === 'done' && research.markdown && (
        <Box className={CLASSES.research}>
          {renderMarkdown(research.markdown)}
          <Box className={CLASSES.note} sx={STYLES.note}>
            Deep dive by {research.model || 'your model'} · {ago(research.completedAt, nowMs)}
          </Box>
        </Box>
      )}
      {research?.state === 'running' && renderRunning(research)}
      {isIdle && (
        <Box className={CLASSES.researchStart}>
          <Typography className={CLASSES.note} sx={STYLES.note} component="p">
            Pulls the latest related coverage from across the web (GDELT{hasTavily ? ' + Tavily' : ''}), reads it,
            and has your model write a cited companion: background, actors, competing interpretations, implications.
          </Typography>
          {research?.state === 'error' && (
            <Box className={clsx(CLASSES.note, CLASSES.noteError)} sx={[STYLES.note, STYLES.noteError]}>
              Last attempt failed: {research.error || 'unknown error'}
            </Box>
          )}
          {isAuthed && hasKey && (
            <Button className={CLASSES.researchButton} sx={[STYLES.button, STYLES.buttonPrimary]} onClick={onResearch}>
              🔍 Read more about it
            </Button>
          )}
          {isAuthed && !hasKey && <ReaderKeyCta what="“Read more about it”" onOpenSettings={onOpenSettings} />}
        </Box>
      )}
    </Box>
  );
}
