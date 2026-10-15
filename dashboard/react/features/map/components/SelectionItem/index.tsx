import { useCallback } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface SelectionItemProps {
  index: number;
  name: string;
  meta: string;
  onFocus: (index: number) => void;
}

export function SelectionItem({ index, name, meta, onFocus }: SelectionItemProps) {
  const onClick = useCallback(() => onFocus(index), [onFocus, index]);
  return (
    <ButtonBase className={CLASSES.panelItem} sx={STYLES.panelItem} onClick={onClick}>
      <Box component="span" className={CLASSES.panelItemName} sx={STYLES.panelItemName}>{name}</Box>
      <Box component="span" className={CLASSES.panelItemMeta} sx={STYLES.panelItemMeta}>{meta}</Box>
    </ButtonBase>
  );
}
