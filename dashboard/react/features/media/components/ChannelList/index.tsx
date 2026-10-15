import { CHANNELS } from '../../channels';
import { CLASSES } from '../../classes';
import { ChannelButton } from '../ChannelButton';

export interface ChannelListProps {
  channelIndex: number;
  onSelectChannel: (index: number) => void;
}

export function ChannelList({ channelIndex, onSelectChannel }: ChannelListProps) {
  return (
    <div className={CLASSES.channels} id="channels" role="list">
      {CHANNELS.map((c, i) => (
        <ChannelButton key={c.id} channel={c} index={i} isActive={i === channelIndex} onSelect={onSelectChannel} />
      ))}
    </div>
  );
}
