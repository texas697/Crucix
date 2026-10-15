import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import type { DrawTool } from '../../../features/map/selection';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { DrawToolButton } from './components/DrawToolButton';

export interface SnapshotMapControlsProps {
  drawTool: DrawTool | null;
  onSetDrawTool: (tool: DrawTool | null) => void;
  onClearSelection: () => void;
  onOpenGuide: () => void;
}

const DRAW_TOOLS: ReadonlyArray<{ tool: DrawTool; label: string; glyph: string }> = [
  { tool: 'circle', label: 'Draw circle', glyph: '◯' },
  { tool: 'rect', label: 'Draw rectangle', glyph: '▭' },
  { tool: 'poly', label: 'Draw polygon', glyph: '⬠' },
];

export function SnapshotMapControls({ drawTool, onSetDrawTool, onClearSelection, onOpenGuide }: SnapshotMapControlsProps) {
  return (
    <Box className={CLASSES.mapControls} sx={STYLES.mapControls}>
      {DRAW_TOOLS.map(({ tool, label, glyph }) => (
        <DrawToolButton key={tool} tool={tool} label={label} glyph={glyph} isOn={drawTool === tool} onSetDrawTool={onSetDrawTool} />
      ))}
      <IconButton className={CLASSES.mapControl} sx={STYLES.mapControl} aria-label="Clear selection" onClick={onClearSelection}>✕</IconButton>
      <IconButton className={CLASSES.mapControl} sx={STYLES.mapControl} aria-label="Signal guide" onClick={onOpenGuide}>?</IconButton>
    </Box>
  );
}
