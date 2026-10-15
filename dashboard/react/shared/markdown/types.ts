export type MarkdownBlockKind = 'heading' | 'rule' | 'list' | 'quote' | 'paragraph';

export interface MarkdownBlock {
  kind: MarkdownBlockKind;
  level: number;
  isOrdered: boolean;
  lines: string[];
}
