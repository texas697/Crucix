import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { asArr, asRec, str } from '../../coerce';
import type { Label } from '../../label';
import type { PanelDataProps } from '../../types';
import { IdeaCard } from '../IdeaCard';
import { IdeasActions } from '../IdeasActions';
import { IdeasEmpty } from '../IdeasEmpty';
import { Panel } from '../Panel';

export interface IdeasPanelProps extends Pick<PanelDataProps, 'data'> {
  tr: Label;
  isSignedIn: boolean;
  hasLlm: boolean;
  llmProvider: string;
  onGenerateIdeas?: () => void;
}

function sourceBadge(source: string, provider: string, tr: Label) {
  if (source === 'mine') return <span className={clsx(CLASSES.ideasSource, CLASSES.ideasSourceMine)}>MY {(provider || 'LLM').toUpperCase()}</span>;
  if (source === 'llm') return <span className={clsx(CLASSES.ideasSource, CLASSES.ideasSourceLlm)}>{tr('ideas.aiEnhanced', 'AI ENHANCED')}</span>;
  if (source === 'rules') return <span className={clsx(CLASSES.ideasSource, CLASSES.ideasSourceStatic)}>{tr('ideas.signalBased', 'SIGNAL BASED')}</span>;
  return <span className={clsx(CLASSES.ideasSource, CLASSES.ideasSourceStatic)}>{tr('ideas.pending', 'PENDING')}</span>;
}

export function IdeasPanel({ data, tr, isSignedIn, hasLlm, llmProvider, onGenerateIdeas }: IdeasPanelProps) {
  const ideas = asArr(data.ideas);
  const ideasMeta = asRec(data.ideasMeta);
  const ideasSource = str(data.ideasSource);
  const hasIdeas = ideas.length > 0;
  const generatedAt = ideasSource === 'mine' ? str(ideasMeta.generatedAt) : '';

  return (
    <Panel
      id="pIdeas"
      title={<>{tr('panels.tradeIdeas', 'Leverageable ideas')}{sourceBadge(ideasSource, str(ideasMeta.provider), tr)}</>}
      headExtra={<IdeasActions isSignedIn={isSignedIn} hasLlm={hasLlm} hasIdeas={hasIdeas} generatedAt={generatedAt} onGenerateIdeas={onGenerateIdeas} />}
      flex="2 1 440px"
    >
      {hasIdeas
        ? <div className={CLASSES.ideasList}>{ideas.map((idea, i) => <IdeaCard key={`${str(idea.type)}-${i}`} idea={idea} />)}</div>
        : <IdeasEmpty isSignedIn={isSignedIn} hasLlm={hasLlm} llmProvider={llmProvider} onGenerateIdeas={onGenerateIdeas} />}
      <div className={CLASSES.disclosure}>For informational purposes only. Not financial advice or a solicitation to buy or sell any security. Observations derive from publicly available OSINT data. Consult a licensed financial advisor before investing.</div>
    </Panel>
  );
}
