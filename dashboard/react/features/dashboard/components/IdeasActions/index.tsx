import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { CLASSES } from '../../classes';
import { getAge } from '../../format';
import { STYLES } from '../IdeasPanel/styles';

export interface IdeasActionsProps {
  isSignedIn: boolean;
  hasLlm: boolean;
  hasIdeas: boolean;
  generatedAt: string;
  onGenerateIdeas?: () => void;
}

export function IdeasActions({ isSignedIn, hasLlm, hasIdeas, generatedAt, onGenerateIdeas }: IdeasActionsProps) {
  if (isSignedIn && !hasLlm) {
    return (
      <Box component="span" className={CLASSES.ideasActions} sx={[STYLES.ideasActions, STYLES.headActions]}>
        <Button variant="outlined" className={CLASSES.ideasGen} sx={STYLES.ideasGen} title="Enter your LLM API key for AI-generated ideas">
          {'⚡'} Add AI key
        </Button>
      </Box>
    );
  }
  if (!hasLlm) return null;
  return (
    <Box component="span" className={CLASSES.ideasActions} sx={[STYLES.ideasActions, STYLES.headActions]}>
      <Box component="span" className={CLASSES.ideasActionsInner} sx={STYLES.ideasActions}>
        {generatedAt ? <Box component="span" className={CLASSES.ideasMeta} sx={STYLES.ideasMeta}>{getAge(generatedAt)}</Box> : null}
        <Button variant="outlined" className={CLASSES.ideasGen} sx={STYLES.ideasGen} id="ideasGenBtn" onClick={onGenerateIdeas}>
          {hasIdeas ? 'Regenerate' : 'Generate'}
        </Button>
      </Box>
    </Box>
  );
}
