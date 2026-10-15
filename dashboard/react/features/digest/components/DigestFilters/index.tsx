import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { FILTER_LABELS } from '../../consts';
import type { DigestFilter } from '../../types';

export interface DigestFiltersProps {
  filter: DigestFilter;
  searchValue: string;
  onChooseFilter: (filter: DigestFilter) => void;
  onSearchChange: (value: string) => void;
}

interface FilterPillProps {
  value: DigestFilter;
  label: string;
  isActive: boolean;
  onChoose: (filter: DigestFilter) => void;
}

function FilterPill({ value, label, isActive, onChoose }: FilterPillProps) {
  const onClick = useCallback(() => onChoose(value), [onChoose, value]);
  return (
    <button
      type="button"
      className={clsx(CLASSES.pill, isActive && CLASSES.pillActive)}
      data-filter={value}
      aria-pressed={isActive}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function DigestFilters({ filter, searchValue, onChooseFilter, onSearchChange }: DigestFiltersProps) {
  const onInput = useCallback((e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value), [onSearchChange]);
  return (
    <div className={CLASSES.filters}>
      <div className={CLASSES.filterGroup} role="group" aria-label="Filter the digest">
        {FILTER_LABELS.map((f) => (
          <FilterPill key={f.value} value={f.value} label={f.label} isActive={filter === f.value} onChoose={onChooseFilter} />
        ))}
      </div>
      <input
        id="digest-search"
        className={CLASSES.search}
        type="search"
        value={searchValue}
        placeholder="Search titles, topics, write-ups"
        autoComplete="off"
        aria-label="Search titles, topics, write-ups"
        onChange={onInput}
      />
    </div>
  );
}
