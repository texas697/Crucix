import { BULLET_RE, HEADING_RE, ORDERED_RE, QUOTE_RE, RULE_RE } from './consts';
import type { MarkdownBlock } from './types';

function block(kind: MarkdownBlock['kind'], lines: string[], level = 0, isOrdered = false): MarkdownBlock {
  return { kind, level, isOrdered, lines };
}

export function parseMarkdownBlocks(md: string | null | undefined): MarkdownBlock[] {
  const lines = String(md ?? '').replace(/\r/g, '').split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: MarkdownBlock | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(block('paragraph', [paragraph.join(' ')]));
    paragraph = [];
  };
  const closeList = () => {
    if (list) blocks.push(list);
    list = null;
  };
  const pushItem = (isOrdered: boolean, text: string) => {
    flushParagraph();
    if (!list || list.isOrdered !== isOrdered) {
      closeList();
      list = block('list', [], 0, isOrdered);
    }
    list.lines.push(text);
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) { flushParagraph(); closeList(); continue; }
    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph(); closeList();
      blocks.push(block('heading', [heading[2] ?? ''], Math.min(3, (heading[1]?.length ?? 1) + 1)));
      continue;
    }
    if (RULE_RE.test(line.trim())) { flushParagraph(); closeList(); blocks.push(block('rule', [])); continue; }
    const bullet = BULLET_RE.exec(line);
    if (bullet) { pushItem(false, bullet[1] ?? ''); continue; }
    const ordered = ORDERED_RE.exec(line);
    if (ordered) { pushItem(true, ordered[1] ?? ''); continue; }
    const quote = QUOTE_RE.exec(line);
    if (quote) { flushParagraph(); closeList(); blocks.push(block('quote', [quote[1] ?? ''])); continue; }
    closeList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  closeList();
  return blocks;
}
