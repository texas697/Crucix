import List from '@mui/material/List';
import { CHANNELS } from '../../channels';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { ChannelButton } from '../ChannelButton';

export interface ChannelListProps {
  channelIndex: number;
  onSelectChannel: (index: number) => void;
}

export function ChannelList({ channelIndex, onSelectChannel }: ChannelListProps) {
  return (
    <List disablePadding className={CLASSES.channels} sx={STYLES.channels} id="channels">
      {CHANNELS.map((c, i) => (
        <ChannelButton key={c.id} channel={c} index={i} isActive={i === channelIndex} onSelect={onSelectChannel} />
      ))}
    </List>
  );
}
