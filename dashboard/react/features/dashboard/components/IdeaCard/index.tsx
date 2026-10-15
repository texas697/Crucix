import clsx from 'clsx';
import { CLASSES, IDEA_TYPE_CLASSES } from '../../classes';
import { str, type Rec } from '../../coerce';

export interface IdeaCardProps {
  idea: Rec;
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const type = str(idea.type);
  return (
    <article className={CLASSES.ideaCard}>
      <div className={CLASSES.ideaMeta}>
        <span className={clsx(CLASSES.ideaType, IDEA_TYPE_CLASSES[type.toLowerCase()])}>{type.toUpperCase()}</span>
        {idea.ticker ? <span className={CLASSES.ideaTicker}>{str(idea.ticker)}</span> : null}
        {idea.horizon ? <span className={CLASSES.ideaHorizon}>{str(idea.horizon)}</span> : null}
        <span className={CLASSES.ideaConfidence}>{str(idea.confidence)} confidence</span>
      </div>
      <div className={CLASSES.ideaTitle}>{str(idea.title)}</div>
      <div className={CLASSES.ideaText}>{str(idea.text) || str(idea.rationale)}</div>
      {idea.risk ? <div className={CLASSES.ideaRisk}>Risk {'·'} {str(idea.risk)}</div> : null}
    </article>
  );
}
