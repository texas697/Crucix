import { useCallback } from 'react';
import IconButton from '@mui/material/IconButton';
import clsx from 'clsx';
import type { DrawTool } from '../../../../../features/map/selection';
import { CLASSES } from '../../../../classes';
import { STYLES } from '../../../../styles';

export interface DrawToolButtonProps {
  tool: DrawTool;
  label: string;
  glyph: string;
  isOn: boolean;
  onSetDrawTool: (tool: DrawTool | null) => void;
}

export function DrawToolButton({ tool, label, glyph, isOn, onSetDrawTool }: DrawToolButtonProps) {
  const onClick = useCallback(() => {
    onSetDrawTool(isOn ? null : tool);
  }, [onSetDrawTool, isOn, tool]);

  return (
    <IconButton
      className={clsx(CLASSES.mapControl, isOn && `${CLASSES.mapControl}--on`)}
      sx={[STYLES.mapControl, isOn && STYLES.mapControlOn]}
      aria-label={label}
      aria-pressed={isOn}
      onClick={onClick}
    >
      {glyph}
    </IconButton>
  );
}
