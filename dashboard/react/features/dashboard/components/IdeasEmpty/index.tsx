import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface IdeasEmptyProps {
  isSignedIn: boolean;
  hasLlm: boolean;
  llmProvider: string;
  onGenerateIdeas?: () => void;
}

function ByokEmpty() {
  return (
    <div className={CLASSES.byokEmpty}>
      <div className={CLASSES.byokBig}>{'⚡'} Unlock AI trade ideas</div>
      <div className={CLASSES.byokWhy}>The ideas below are rule-based. Enter your own LLM API key and Crucix will have your model read every sweep and write ideas just for you.</div>
      <button type="button" className={CLASSES.ideasGen}>Enter my API key</button>
      <div className={CLASSES.byokProviders}>ANTHROPIC {'·'} OPENAI {'·'} GEMINI {'·'} OPENROUTER {'·'} GROK {'·'} MISTRAL {'·'} ANY OPENAI-COMPATIBLE</div>
    </div>
  );
}

export function IdeasEmpty({ isSignedIn, hasLlm, llmProvider, onGenerateIdeas }: IdeasEmptyProps) {
  return (
    <div className={CLASSES.ideasEmpty} style={STYLES.emptyIdeas}>
      <div className={CLASSES.ideasEmptyIcon} style={STYLES.emptyIdeasIcon}>{'⚠'}</div>
      {!isSignedIn ? (
        <>
          <div className={CLASSES.ideasEmptyTitle}>LLM not configured</div>
          <div className={CLASSES.ideasEmptySub} style={STYLES.emptyIdeasSub}>Set LLM_PROVIDER + credentials in .env to enable AI-powered trade ideas</div>
        </>
      ) : hasLlm ? (
        <>
          <div className={CLASSES.ideasEmptyTitle}>No AI ideas yet</div>
          <div className={CLASSES.ideasEmptySub} style={STYLES.emptyIdeasSub}>Your {llmProvider} key is saved.</div>
          <div className={CLASSES.ideasEmptyAction} style={STYLES.emptyIdeasAction}>
            <button type="button" className={CLASSES.ideasGen} onClick={onGenerateIdeas}>Generate ideas now</button>
          </div>
        </>
      ) : <ByokEmpty />}
    </div>
  );
}
