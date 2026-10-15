import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES as IDEAS_STYLES } from '../IdeasPanel/styles';
import { STYLES } from './styles';

export interface IdeasEmptyProps {
  isSignedIn: boolean;
  hasLlm: boolean;
  llmProvider: string;
  onGenerateIdeas?: () => void;
}

function ByokEmpty() {
  return (
    <Box className={CLASSES.byokEmpty} sx={STYLES.byokEmpty}>
      <Box className={CLASSES.byokBig} sx={STYLES.byokBig}>{'⚡'} Unlock AI trade ideas</Box>
      <Box className={CLASSES.byokWhy} sx={STYLES.byokWhy}>The ideas below are rule-based. Enter your own LLM API key and Crucix will have your model read every sweep and write ideas just for you.</Box>
      <Button variant="outlined" className={clsx(CLASSES.ideasGen, CLASSES.byokGen)} sx={[IDEAS_STYLES.ideasGen, STYLES.byokGen]}>Enter my API key</Button>
      <Box className={CLASSES.byokProviders} sx={STYLES.byokProviders}>ANTHROPIC {'·'} OPENAI {'·'} GEMINI {'·'} OPENROUTER {'·'} GROK {'·'} MISTRAL {'·'} ANY OPENAI-COMPATIBLE</Box>
    </Box>
  );
}

export function IdeasEmpty({ isSignedIn, hasLlm, llmProvider, onGenerateIdeas }: IdeasEmptyProps) {
  return (
    <Box className={CLASSES.ideasEmpty} sx={STYLES.ideasEmpty}>
      <Box className={CLASSES.ideasEmptyIcon} sx={STYLES.ideasEmptyIcon}>{'⚠'}</Box>
      {!isSignedIn ? (
        <>
          <Box className={CLASSES.ideasEmptyTitle}>LLM not configured</Box>
          <Box className={CLASSES.ideasEmptySub} sx={STYLES.ideasEmptySub}>Set LLM_PROVIDER + credentials in .env to enable AI-powered trade ideas</Box>
        </>
      ) : hasLlm ? (
        <>
          <Box className={CLASSES.ideasEmptyTitle}>No AI ideas yet</Box>
          <Box className={CLASSES.ideasEmptySub} sx={STYLES.ideasEmptySub}>Your {llmProvider} key is saved.</Box>
          <Box className={CLASSES.ideasEmptyAction} sx={STYLES.ideasEmptyAction}>
            <Button variant="outlined" className={CLASSES.ideasGen} sx={IDEAS_STYLES.ideasGen} onClick={onGenerateIdeas}>Generate ideas now</Button>
          </Box>
        </>
      ) : <ByokEmpty />}
    </Box>
  );
}
