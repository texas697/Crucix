import { useCallback } from 'react';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import type { DigestTopicCount } from '../../types';

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
    <button
      type="button"
      className={clsx(CLASSES.topic, isActive && CLASSES.topicActive)}
      data-topic={topic}
      aria-pressed={isActive}
      onClick={onClick}
    >
      {topic} <span className={CLASSES.topicCount}>{count}</span>
    </button>
  );
}

export function DigestTopics({ topics, activeTopic, onToggleTopic }: DigestTopicsProps) {
  return (
    <div className={CLASSES.topics}>
      {topics.map((t) => (
        <TopicChip key={t.topic} topic={t.topic} count={t.count} isActive={activeTopic === t.topic} onToggle={onToggleTopic} />
      ))}
    </div>
  );
}
