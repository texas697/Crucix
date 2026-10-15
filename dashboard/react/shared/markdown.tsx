import type { ReactNode } from 'react';
import { safeExternalUrl } from './safeUrl';

// Ports the legacy reader's small supported markdown subset to React nodes. The legacy version
// escaped HTML then string-replaced into an innerHTML blob; here we build nodes so React escapes
// everything and only http(s) links become anchors (richer markdown is a separate feature).
//
// Supported: #/##/### headings (rendered h2–h4, matching the legacy level shift), `---`/`***` rules,
// bullet and ordered lists, blockquotes, paragraphs, and inline code / strong / em / links /
// bare-URL autolinks.

const INLINE_RE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s<)]+)/g;

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let n = 0;
  INLINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-i${n++}`;
    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('[')) {
      const m = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
      const label = m?.[1] ?? token;
      const href = safeExternalUrl(m?.[2]);
      nodes.push(
        href
          ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{label}</a>
          : label,
      );
    } else {
      const href = safeExternalUrl(token);
      nodes.push(
        href
          ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{token}</a>
          : token,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Render a markdown string to React nodes. Never injects raw HTML. */
export function renderMarkdown(md: string | null | undefined): ReactNode {
  const lines = String(md ?? '').replace(/\r/g, '').split('\n');
  const blocks: ReactNode[] = [];
  let key = 0;

  let paragraphs: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let items: ReactNode[] = [];

  const flushParagraph = () => {
    if (paragraphs.length) {
      blocks.push(<p key={`b${key++}`}>{renderInline(paragraphs.join(' '), `b${key}`)}</p>);
      paragraphs = [];
    }
  };
  const closeList = () => {
    if (list) {
      const Tag = list;
      blocks.push(<Tag key={`b${key++}`}>{items}</Tag>);
      list = null;
      items = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) { flushParagraph(); closeList(); continue; }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph(); closeList();
      const level = Math.min(3, (heading[1]?.length ?? 1) + 1);
      const Tag = (['h2', 'h3', 'h4'] as const)[level - 2] ?? 'h2';
      blocks.push(<Tag key={`b${key++}`}>{renderInline(heading[2] ?? '', `b${key}`)}</Tag>);
      continue;
    }
    if (/^(---|\*\*\*)$/.test(line.trim())) {
      flushParagraph(); closeList();
      blocks.push(<hr key={`b${key++}`} />);
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (list !== 'ul') { closeList(); list = 'ul'; }
      items.push(<li key={`li${key++}`}>{renderInline(bullet[1] ?? '', `li${key}`)}</li>);
      continue;
    }
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      flushParagraph();
      if (list !== 'ol') { closeList(); list = 'ol'; }
      items.push(<li key={`li${key++}`}>{renderInline(ordered[1] ?? '', `li${key}`)}</li>);
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph(); closeList();
      blocks.push(<blockquote key={`b${key++}`}>{renderInline(quote[1] ?? '', `b${key}`)}</blockquote>);
      continue;
    }
    closeList();
    paragraphs.push(line.trim());
  }
  flushParagraph();
  closeList();
  return blocks;
}
