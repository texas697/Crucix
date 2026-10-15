export const INLINE_RE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s<)]+)/g;

export const LINK_RE = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

export const HEADING_RE = /^(#{1,3})\s+(.*)$/;

export const RULE_RE = /^(---|\*\*\*)$/;

export const BULLET_RE = /^\s*[-*•]\s+(.*)$/;

export const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;

export const QUOTE_RE = /^>\s?(.*)$/;

export const HEADING_TAGS = ['h2', 'h3', 'h4'] as const;

export const HEADING_VARIANTS = ['h4', 'h5', 'h6'] as const;
