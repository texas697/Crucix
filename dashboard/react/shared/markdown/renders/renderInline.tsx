import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { safeExternalUrl } from '../../safeUrl';
import { CLASSES } from '../classes';
import { INLINE_RE, LINK_RE } from '../consts';

function renderLink(href: string | null, label: string, key: string): ReactNode {
  if (!href) return label;
  return <Link key={key} className={CLASSES.link} href={href} target="_blank" rel="noopener noreferrer">{label}</Link>;
}

function renderToken(token: string, key: string): ReactNode {
  if (token.startsWith('`')) return <Box component="code" key={key} className={CLASSES.code}>{token.slice(1, -1)}</Box>;
  if (token.startsWith('**')) return <Box component="strong" key={key} className={CLASSES.strong}>{token.slice(2, -2)}</Box>;
  if (token.startsWith('*') || token.startsWith('_')) return <Box component="em" key={key} className={CLASSES.em}>{token.slice(1, -1)}</Box>;
  if (token.startsWith('[')) {
    const match = LINK_RE.exec(token);
    return renderLink(safeExternalUrl(match?.[2]), match?.[1] ?? token, key);
  }
  return renderLink(safeExternalUrl(token), token, key);
}

export function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let count = 0;
  INLINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    nodes.push(renderToken(token, `${keyBase}-i${count++}`));
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
