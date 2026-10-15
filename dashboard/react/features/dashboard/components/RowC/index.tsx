import { asRec, str } from '../../coerce';
import { makeLabel } from '../../label';
import type { PanelDataProps } from '../../types';
import { IdeasPanel } from '../IdeasPanel';
import { MaritimePanel } from '../MaritimePanel';
import { SpacePanel } from '../SpacePanel';

export interface RowCProps extends PanelDataProps {
  me?: { llm?: unknown } | null;
  onGenerateIdeas?: () => void;
}

export function RowC({ data, t, me, onGenerateIdeas }: RowCProps) {
  const tr = makeLabel(t);
  const meLlm = me ? me.llm : null;
  const hasLlm = !!meLlm && typeof meLlm === 'object';
  return (
    <>
      <IdeasPanel
        data={data}
        tr={tr}
        isSignedIn={!!me}
        hasLlm={hasLlm}
        llmProvider={hasLlm ? str(asRec(meLlm).provider) : ''}
        onGenerateIdeas={onGenerateIdeas}
      />
      <MaritimePanel data={data} tr={tr} />
      <SpacePanel data={data} tr={tr} />
    </>
  );
}
