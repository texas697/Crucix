import { useCallback } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import type { DigestTopicCount } from '../../types';
import { STYLES } from './styles';

export interface DigestTopicsProps {
  topics: DigestTopicCount[];
  activeTopic: string;
  onToggleTopic: (topic: string) => void;
}

interface TopicChipProps {
  topic: string;
  count: number;
  isActive: boolean;
  onToggle: (topic: string) => void;
}

function TopicChip({ topic, count, isActive, onToggle }: TopicChipProps) {
  const onClick = useCallback(() => onToggle(topic), [onToggle, topic]);
  return (
    <Chip
      clickable
      className={clsx(CLASSES.topic, isActive && CLASSES.topicActive)}
      sx={[STYLES.topic, isActive && STYLES.topicActive]}
      data-topic={topic}
      aria-pressed={isActive}
      onClick={onClick}
      label={<>{topic} <Box component="span" className={CLASSES.topicCount} sx={STYLES.topicCount}>{count}</Box></>}
    />
  );
}

export function DigestTopics({ topics, activeTopic, onToggleTopic }: DigestTopicsProps) {
  return (
    <Box className={CLASSES.topics} sx={STYLES.topics}>
      {topics.map((t) => (
        <TopicChip key={t.topic} topic={t.topic} count={t.count} isActive={activeTopic === t.topic} onToggle={onToggleTopic} />
      ))}
    </Box>
  );
}
