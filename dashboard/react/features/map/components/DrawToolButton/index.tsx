import { useCallback } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import type { DrawTool } from '../../selection';
import { STYLES } from '../../styles';

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
    <Tooltip title={label} placement="right" className={CLASSES.controlTip}>
      <IconButton
        className={clsx(CLASSES.control, isOn && CLASSES.controlOn)}
        sx={STYLES.control}
        aria-label={label}
        aria-pressed={isOn}
        data-tool={tool}
        onClick={onClick}
      >
        {glyph}
      </IconButton>
    </Tooltip>
  );
}
