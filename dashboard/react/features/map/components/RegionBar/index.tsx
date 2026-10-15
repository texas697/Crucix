import { useCallback, type KeyboardEvent, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import clsx from 'clsx';
import { CLASSES } from '../../classes';
import { REGION_ORDER, type RegionKey } from '../../regions';
import { STYLES } from '../../styles';

export interface RegionBarProps {
  region: RegionKey;
  sourcesOk: number;
  sourcesQueried: number;
  markers: number;
  news: number;
  onRegion: (region: RegionKey) => void;
  onSearch: (query: string) => void;
  hint?: string;
}

const SEARCH_PLACEHOLDER = 'Search place, event, channel';

function regionButtonLabel(region: RegionKey): string {
  if (region === 'middleEast') return 'MIDDLE EAST';
  if (region === 'asiaPacific') return 'ASIA PACIFIC';
  return region.toUpperCase();
}

export function RegionBar({
  region, sourcesOk, sourcesQueried, markers, news, onRegion, onSearch, hint = 'Scroll to zoom · drag to pan',
}: RegionBarProps) {
  const onRegionChange = useCallback((_event: MouseEvent<HTMLElement>, value: RegionKey | null) => {
    if (value) onRegion(value);
  }, [onRegion]);

  const onSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;
    onSearch(event.currentTarget.value);
    event.currentTarget.blur();
  }, [onSearch]);

  return (
    <Box className={CLASSES.regionBar} id="mapRegionBar" sx={STYLES.regionBar}>
      <ToggleButtonGroup
        className={CLASSES.regions}
        sx={STYLES.regions}
        exclusive
        value={region}
        onChange={onRegionChange}
        aria-label="Map region"
      >
        {REGION_ORDER.map((key) => (
          <ToggleButton
            key={key}
            value={key}
            className={clsx(CLASSES.regionButton, key === region && CLASSES.regionButtonActive)}
            sx={STYLES.regionButton}
            data-region={key}
            disableRipple
          >
            {regionButtonLabel(key)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <InputBase
        className={CLASSES.search}
        id="mapSearch"
        type="search"
        placeholder={SEARCH_PLACEHOLDER}
        autoComplete="off"
        sx={STYLES.search}
        onKeyDown={onSearchKeyDown}
        inputProps={{ 'aria-label': SEARCH_PLACEHOLDER }}
      />
      <Box className={CLASSES.barSpacer} sx={STYLES.barSpacer} />
      <Box component="span" className={CLASSES.barLive} sx={STYLES.barLive}>
        <Box component="span" className={CLASSES.barDot} sx={STYLES.barDot} />
        Live
      </Box>
      <Box component="span" className={CLASSES.barMeta} sx={STYLES.barMeta}>
        {sourcesOk}/{sourcesQueried} sources · {markers} markers · {news} news
      </Box>
      <Box component="span" className={CLASSES.barHint} id="mapHint" sx={STYLES.barHint}>{hint}</Box>
    </Box>
  );
}
