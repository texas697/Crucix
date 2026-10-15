import type { DrawTool } from '../../../map/selection';
import { CLASSES } from '../../classes';
import { DrawToolButton } from '../DrawToolButton';

export interface MapControlsProps {
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

export function MapControls({ drawTool, onSetDrawTool, onClearSelection, onOpenGuide }: MapControlsProps) {
  return (
    <div className={CLASSES.mapControls}>
      {DRAW_TOOLS.map(({ tool, label, glyph }) => (
        <DrawToolButton key={tool} tool={tool} label={label} glyph={glyph} isOn={drawTool === tool} onSetDrawTool={onSetDrawTool} />
      ))}
      <button type="button" className={CLASSES.mapControl} aria-label="Clear selection" onClick={onClearSelection}>✕</button>
      <button type="button" className={CLASSES.mapControl} aria-label="Signal guide" onClick={onOpenGuide}>?</button>
    </div>
  );
}
