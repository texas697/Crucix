import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../classes';
import { HEADING_TAGS, HEADING_VARIANTS } from '../consts';
import type { MarkdownBlock } from '../types';
import { renderInline } from './renderInline';

function renderHeading(block: MarkdownBlock, key: string): ReactNode {
  const index = Math.max(0, Math.min(HEADING_TAGS.length - 1, block.level - 2));
  return (
    <Typography key={key} className={CLASSES.heading} variant={HEADING_VARIANTS[index] ?? 'h4'} component={HEADING_TAGS[index] ?? 'h2'}>
      {renderInline(block.lines[0] ?? '', key)}
    </Typography>
  );
}

function renderList(block: MarkdownBlock, key: string): ReactNode {
  return (
    <Typography key={key} className={CLASSES.list} variant="body1" component={block.isOrdered ? 'ol' : 'ul'}>
      {block.lines.map((line, index) => (
        <Box component="li" key={`${key}-li${index}`} className={CLASSES.item}>{renderInline(line, `${key}-li${index}`)}</Box>
      ))}
    </Typography>
  );
}

export function renderBlock(block: MarkdownBlock, key: string): ReactNode {
  if (block.kind === 'heading') return renderHeading(block, key);
  if (block.kind === 'rule') return <Divider key={key} className={CLASSES.rule} component="hr" />;
  if (block.kind === 'list') return renderList(block, key);
  if (block.kind === 'quote') {
    return (
      <Typography key={key} className={CLASSES.quote} variant="body1" component="blockquote">
        {renderInline(block.lines[0] ?? '', key)}
      </Typography>
    );
  }
  return (
    <Typography key={key} className={CLASSES.paragraph} variant="body1" component="p">
      {renderInline(block.lines[0] ?? '', key)}
    </Typography>
  );
}
