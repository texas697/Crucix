import type { ReactNode } from 'react';
import type { AbArticle } from '../areaBriefTypes';
import { CiteLink } from '../components/CiteLink';

const CITE_RE = /\[(\d{1,2})\]/g;

export function renderCite(text: string | undefined, articles: AbArticle[], onHover: (index: number | null) => void): ReactNode[] {
  const source = text ?? '';
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of source.matchAll(CITE_RE)) {
    const at = match.index ?? 0;
    if (at > last) nodes.push(source.slice(last, at));
    const index = Number(match[1]);
    const article = articles[index - 1];
    if (article) nodes.push(<CiteLink key={`cite-${key++}`} index={index} article={article} onHover={onHover} />);
    else nodes.push(match[0]);
    last = at + match[0].length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}
