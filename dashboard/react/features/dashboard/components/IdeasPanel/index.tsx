import Box from '@mui/material/Box';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { asArr, asRec, str } from '../../coerce';
import type { Label } from '../../label';
import type { PanelDataProps } from '../../types';
import { IdeaCard } from '../IdeaCard';
import { IdeasActions } from '../IdeasActions';
import { IdeasEmpty } from '../IdeasEmpty';
import { Panel } from '../Panel';
import { STYLES } from './styles';

export interface IdeasPanelProps extends Pick<PanelDataProps, 'data'> {
  tr: Label;
  isSignedIn: boolean;
  hasLlm: boolean;
  llmProvider: string;
  onGenerateIdeas?: () => void;
}

function SourceBadge({ source, provider, tr }: { source: string; provider: string; tr: Label }) {
  if (source === 'mine') {
    return <Box component="span" className={clsx(CLASSES.ideasSource, CLASSES.ideasSourceMine)} sx={[STYLES.ideasSource, STYLES.ideasSourceMine]}>MY {(provider || 'LLM').toUpperCase()}</Box>;
  }
  if (source === 'llm') {
    return <Box component="span" className={clsx(CLASSES.ideasSource, CLASSES.ideasSourceLlm)} sx={[STYLES.ideasSource, STYLES.ideasSourceLlm]}>{tr('ideas.aiEnhanced', 'AI ENHANCED')}</Box>;
  }
  const text = source === 'rules' ? tr('ideas.signalBased', 'SIGNAL BASED') : tr('ideas.pending', 'PENDING');
  return <Box component="span" className={clsx(CLASSES.ideasSource, CLASSES.ideasSourceStatic)} sx={[STYLES.ideasSource, STYLES.ideasSourceStatic]}>{text}</Box>;
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
      title={<>{tr('panels.tradeIdeas', 'Leverageable ideas')}<SourceBadge source={ideasSource} provider={str(ideasMeta.provider)} tr={tr} /></>}
      headExtra={<IdeasActions isSignedIn={isSignedIn} hasLlm={hasLlm} hasIdeas={hasIdeas} generatedAt={generatedAt} onGenerateIdeas={onGenerateIdeas} />}
      flex="2 1 440px"
    >
      {hasIdeas
        ? <Box className={CLASSES.ideasList} sx={STYLES.ideasList}>{ideas.map((idea, i) => <IdeaCard key={`${str(idea.type)}-${i}`} idea={idea} />)}</Box>
        : <IdeasEmpty isSignedIn={isSignedIn} hasLlm={hasLlm} llmProvider={llmProvider} onGenerateIdeas={onGenerateIdeas} />}
      <Box className={CLASSES.disclosure} sx={STYLES.disclosure}>
        For informational purposes only. Not financial advice or a solicitation to buy or sell any security. Observations derive from publicly available OSINT data. Consult a licensed financial advisor before investing.
      </Box>
    </Panel>
  );
}
