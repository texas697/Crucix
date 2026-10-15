import { useCallback, useMemo, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { FILTER_LABELS } from '../../consts';
import type { DigestFilter } from '../../types';
import { STYLES } from './styles';

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

const SEARCH_LABEL = 'Search titles, topics, write-ups';

function FilterPill({ value, label, isActive, onChoose }: FilterPillProps) {
  const onClick = useCallback(() => onChoose(value), [onChoose, value]);
  return (
    <ToggleButton
      value={value}
      data-filter={value}
      className={clsx(CLASSES.pill, isActive && CLASSES.pillActive)}
      sx={STYLES.pill}
      onClick={onClick}
    >
      {label}
    </ToggleButton>
  );
}

export function DigestFilters({ filter, searchValue, onChooseFilter, onSearchChange }: DigestFiltersProps) {
  const onInput = useCallback((e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value), [onSearchChange]);
  const searchInputProps = useMemo(
    () => ({ autoComplete: 'off', 'aria-label': SEARCH_LABEL, className: CLASSES.searchInput }),
    [],
  );
  return (
    <Box className={CLASSES.filters} sx={STYLES.filters}>
      <ToggleButtonGroup
        exclusive
        value={filter}
        aria-label="Filter the digest"
        className={CLASSES.filterGroup}
        sx={STYLES.filterGroup}
      >
        {FILTER_LABELS.map((f) => (
          <FilterPill key={f.value} value={f.value} label={f.label} isActive={filter === f.value} onChoose={onChooseFilter} />
        ))}
      </ToggleButtonGroup>
      <TextField
        id="digest-search"
        type="search"
        className={CLASSES.search}
        sx={STYLES.search}
        value={searchValue}
        placeholder={SEARCH_LABEL}
        inputProps={searchInputProps}
        onChange={onInput}
      />
    </Box>
  );
}
