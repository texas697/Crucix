import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import clsx from 'clsx';
import type { AreaBriefState } from '../../areaBriefTypes';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';
import { AreaBriefBody } from '../AreaBriefBody';
import { AreaBriefFoot } from '../AreaBriefFoot';
import { AreaBriefNews } from '../AreaBriefNews';
import { BriefStatus, LOADING_WIDTHS } from '../BriefStatus';

export interface AreaBriefProps {
  state: AreaBriefState;
  onRetry?: () => void;
}

interface BriefPlacesProps {
  names: string[];
  isFallback: boolean;
  isLoading: boolean;
}

const MAX_PLACES = 6;

function BriefPlaces({ names, isFallback, isLoading }: BriefPlacesProps) {
  if (!names.length) {
    if (isLoading) return null;
    return (
      <Box component="span" className={clsx(CLASSES.briefPlaces, CLASSES.briefPlacesFallback)} sx={STYLES.briefPlaces}>open water / unmapped area</Box>
    );
  }
  return (
    <Box component="span" className={clsx(CLASSES.briefPlaces, isFallback && CLASSES.briefPlacesFallback)} sx={STYLES.briefPlaces} title={names.join(', ')}>
      {isFallback ? 'near ' : ''}
      {names.slice(0, MAX_PLACES).join(' · ')}
      {names.length > MAX_PLACES ? ` +${names.length - MAX_PLACES}` : ''}
    </Box>
  );
}

export function AreaBrief({ state, onRetry }: AreaBriefProps) {
  const [hlIndex, setHlIndex] = useState<number | null>(null);
  const placeNames = useMemo(() => state.places.map((place) => place.name), [state.places]);
  if (state.status === 'idle') return null;
  const tone = state.brief?.tone || 'calm';
  const isLoading = state.status === 'loading';

  return (
    <Box
      className={clsx(CLASSES.brief, tone === 'elevated' && CLASSES.briefToneElevated, tone === 'critical' && CLASSES.briefToneCritical)}
      sx={STYLES.brief}
      data-tone={tone}
    >
      <Box className={CLASSES.briefTop} sx={STYLES.briefTop}>
        <Box component="span" className={CLASSES.briefKicker} sx={STYLES.briefKicker}>Area brief</Box>
        <BriefPlaces names={placeNames} isFallback={state.isFallback} isLoading={isLoading} />
      </Box>
      {isLoading
        ? <BriefStatus text="Finding places and headlines…" widths={LOADING_WIDTHS} />
        : (
          <>
            <AreaBriefBody state={state} onRetry={onRetry} onHoverCite={setHlIndex} />
            <AreaBriefNews state={state} hlIndex={hlIndex} />
            {state.llm && <AreaBriefFoot llm={state.llm} />}
          </>
        )}
    </Box>
  );
}
