import { useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import type { MediaChannel } from '../../types';

export interface ChannelButtonProps {
  channel: MediaChannel;
  index: number;
  isActive: boolean;
  onSelect: (index: number) => void;
}

export function ChannelButton({ channel, index, isActive, onSelect }: ChannelButtonProps) {
  const onClick = useCallback(() => onSelect(index), [onSelect, index]);
  const dotStyle = useMemo(() => ({ background: channel.color }), [channel.color]);
  return (
    <button
      type="button"
      role="listitem"
      className={clsx(CLASSES.channel, isActive && CLASSES.channelActive)}
      aria-pressed={isActive}
      onClick={onClick}
    >
      <span className={CLASSES.channelDot} style={dotStyle} />
      <span className={CLASSES.channelText}>
        <span className={CLASSES.channelName}>{channel.name}</span>
        <br />
        <span className={CLASSES.channelRegion}>{channel.region}</span>
      </span>
    </button>
  );
}
