import { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { STYLES, channelDotSx } from '../../styles';
import type { MediaChannel } from '../../types';

export interface ChannelButtonProps {
  channel: MediaChannel;
  index: number;
  isActive: boolean;
  onSelect: (index: number) => void;
}

export function ChannelButton({ channel, index, isActive, onSelect }: ChannelButtonProps) {
  const onClick = useCallback(() => onSelect(index), [onSelect, index]);
  const dotSx = useMemo(() => channelDotSx(channel.color), [channel.color]);
  return (
    <ListItem disablePadding className={CLASSES.channelItem} sx={STYLES.channelItem}>
      <ListItemButton
        disableRipple
        selected={isActive}
        className={clsx(CLASSES.channel, isActive && CLASSES.channelActive)}
        sx={STYLES.channel}
        aria-pressed={isActive}
        onClick={onClick}
      >
        <Box component="span" className={CLASSES.channelDot} sx={dotSx} />
        <Box className={CLASSES.channelText} sx={STYLES.channelText}>
          <Typography component="span" className={CLASSES.channelName} sx={STYLES.channelName}>{channel.name}</Typography>
          <Typography component="span" className={CLASSES.channelRegion} sx={STYLES.channelRegion}>{channel.region}</Typography>
        </Box>
      </ListItemButton>
    </ListItem>
  );
}
