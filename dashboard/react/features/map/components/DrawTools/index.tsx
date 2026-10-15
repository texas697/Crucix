import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { CLASSES } from '../../classes';
import type { DrawTool } from '../../selection';
import { STYLES } from '../../styles';
import { DrawToolButton } from '../DrawToolButton';

export interface DrawToolsProps {
  drawTool: DrawTool | null;
  onSetDrawTool: (tool: DrawTool | null) => void;
  onClearSelection: () => void;
  onOpenGuide: () => void;
}

export const DRAW_TOOLS: ReadonlyArray<{ tool: DrawTool; label: string; glyph: string }> = [
  { tool: 'circle', label: 'Draw circle', glyph: '◯' },
  { tool: 'rect', label: 'Draw rectangle', glyph: '▭' },
  { tool: 'poly', label: 'Draw polygon', glyph: '⬠' },
];

export function DrawTools({ drawTool, onSetDrawTool, onClearSelection, onOpenGuide }: DrawToolsProps) {
  return (
    <Box className={CLASSES.controls} sx={STYLES.controls}>
      {DRAW_TOOLS.map(({ tool, label, glyph }) => (
        <DrawToolButton key={tool} tool={tool} label={label} glyph={glyph} isOn={drawTool === tool} onSetDrawTool={onSetDrawTool} />
      ))}
      <Tooltip title="Clear selection" placement="right" className={CLASSES.controlTip}>
        <IconButton className={CLASSES.control} sx={STYLES.control} aria-label="Clear selection" onClick={onClearSelection}>✕</IconButton>
      </Tooltip>
      <Tooltip title="Signal guide" placement="right" className={CLASSES.controlTip}>
        <IconButton className={CLASSES.control} sx={STYLES.control} aria-label="Signal guide" onClick={onOpenGuide}>?</IconButton>
      </Tooltip>
    </Box>
  );
}
