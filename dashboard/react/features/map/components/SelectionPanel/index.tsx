import { useMemo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import type { MapPoint } from '../../plot';
import { groupSelection } from '../../selectionGroups';
import { STYLES } from '../../styles';
import { SelectionGroup } from '../SelectionGroup';

export interface SelectionPanelProps {
  items: MapPoint[];
  onFocus: (index: number) => void;
  onClear: () => void;
  brief?: ReactNode;
  hasBrief?: boolean;
}

const plural = (count: number): string => (count > 1 ? 's' : '');

export function SelectionPanel({ items, onFocus, onClear, brief, hasBrief = false }: SelectionPanelProps) {
  const groups = useMemo(() => groupSelection(items), [items]);
  if (!items.length && !hasBrief) return null;
  const count = items.length;

  return (
    <Paper className={clsx(CLASSES.panel, hasBrief && CLASSES.panelHasBrief)} id="selPanel" sx={STYLES.panel} elevation={0}>
      <Box className={CLASSES.panelHead} sx={STYLES.panelHead}>
        <Box component="span" className={CLASSES.panelTitle} sx={STYLES.panelTitle}>Selected</Box>
        <Box component="span" className={CLASSES.panelCount} id="selCount" sx={STYLES.panelCount}>{count}</Box>
        <Button className={CLASSES.panelClear} sx={STYLES.panelClear} onClick={onClear}>Clear</Button>
      </Box>
      <Box className={CLASSES.panelBody} id="selBody" sx={STYLES.panelBody}>
        <Box className={CLASSES.panelMount} id="abMount">{brief}</Box>
        {count > 0 && <Box className={CLASSES.panelDivider} sx={STYLES.panelDivider}>Markers in area</Box>}
        {count > 0 && (
          <Box className={CLASSES.panelSummary} sx={STYLES.panelSummary}>
            {count} marker{plural(count)} across {groups.length} layer{plural(groups.length)}
          </Box>
        )}
        {groups.map((group) => <SelectionGroup key={group.type} group={group} onFocus={onFocus} />)}
      </Box>
    </Paper>
  );
}
