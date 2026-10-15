import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { MAX_SELECTION_ROWS, type SelectionGroupData } from '../../selectionGroups';
import { STYLES } from '../../styles';
import { panelDotSx } from '../../stylesPanel';
import { SelectionItem } from '../SelectionItem';

export interface SelectionGroupProps {
  group: SelectionGroupData;
  onFocus: (index: number) => void;
}

export function SelectionGroup({ group, onFocus }: SelectionGroupProps) {
  const dotSx = useMemo(() => panelDotSx(group.color), [group.color]);
  const hidden = group.entries.length - MAX_SELECTION_ROWS;
  return (
    <Box className={CLASSES.panelGroup} sx={STYLES.panelGroup}>
      <Box className={CLASSES.panelGroupHead} sx={STYLES.panelGroupHead}>
        <Box component="span" className={CLASSES.panelDot} sx={dotSx} />
        {group.label}
        <Box component="span" className={CLASSES.panelGroupCount} sx={STYLES.panelGroupCount}>{group.entries.length}</Box>
      </Box>
      {group.entries.slice(0, MAX_SELECTION_ROWS).map(([index, point]) => (
        <SelectionItem
          key={index}
          index={index}
          name={point.popHead || group.label}
          meta={(point.popMeta || '').slice(0, 64)}
          onFocus={onFocus}
        />
      ))}
      {hidden > 0 && <Box className={CLASSES.panelMore} sx={STYLES.panelMore}>+{hidden} more</Box>}
    </Box>
  );
}
