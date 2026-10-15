import { useCallback } from 'react';
import clsx from 'clsx';
import type { DrawTool } from '../../../map/selection';
import { CLASSES } from '../../classes';

export interface DrawToolButtonProps {
  tool: DrawTool;
  label: string;
  glyph: string;
  isOn: boolean;
  onSetDrawTool: (tool: DrawTool | null) => void;
}

export function DrawToolButton({ tool, label, glyph, isOn, onSetDrawTool }: DrawToolButtonProps) {
  const onClick = useCallback(() => onSetDrawTool(isOn ? null : tool), [onSetDrawTool, isOn, tool]);
  return (
    <button
      type="button"
      className={clsx(CLASSES.mapControl, isOn && CLASSES.mapControlOn)}
      aria-label={label}
      aria-pressed={isOn}
      onClick={onClick}
    >
      {glyph}
    </button>
  );
}
