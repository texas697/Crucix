import type { ReactNode } from 'react';
import { renderBlock } from './renders/renderBlock';
import { parseMarkdownBlocks } from './utils';

export function renderMarkdown(md: string | null | undefined): ReactNode {
  return parseMarkdownBlocks(md).map((block, index) => renderBlock(block, `b${index}`));
}

export { CLASSES as MARKDOWN_CLASSES } from './classes';
export type { MarkdownBlock, MarkdownBlockKind } from './types';
