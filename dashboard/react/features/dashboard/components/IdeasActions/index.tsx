import { CLASSES } from '../../classes';
import { getAge } from '../../format';
import { STYLES } from '../../styles';

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
      <span className={CLASSES.ideasActions} style={STYLES.headActions}>
        <button type="button" className={CLASSES.ideasGen} title="Enter your LLM API key for AI-generated ideas">
          {'⚡'} Add AI key
        </button>
      </span>
    );
  }
  if (!hasLlm) return null;
  return (
    <span className={CLASSES.ideasActions} style={STYLES.headActions}>
      <span className={CLASSES.ideasActions}>
        {generatedAt ? <span className={CLASSES.ideasMeta}>{getAge(generatedAt)}</span> : null}
        <button type="button" className={CLASSES.ideasGen} id="ideasGenBtn" onClick={onGenerateIdeas}>
          {hasIdeas ? 'Regenerate' : 'Generate'}
        </button>
      </span>
    </span>
  );
}
