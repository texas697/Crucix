import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ThemeModeProvider } from '../../dashboard/react/app/AppProviders/components/ThemeModeProvider';
import { clampRegion, inRegionBox, textInRegion } from '../../dashboard/react/features/map/regions';
import {
  LAYER_DEFS,
  LAYER_INFO,
  SELECTION_GROUP_LABELS,
  TIME_WINDOW_LIST,
  matchesLayerFilter,
  passesLayer,
  type LayerDef,
} from '../../dashboard/react/features/map/layerDefs';
import { CLASSES } from '../../dashboard/react/features/map/classes';
import { RegionBar } from '../../dashboard/react/features/map/RegionBar';
import { LayerInfoOverlay, MapLegend } from '../../dashboard/react/features/map/MapLegend';

afterEach(cleanup);

// The chrome reads theme.palette.crucix through sx, so it renders inside the app theme like the SPA does.
const renderThemed = (ui: ReactElement) => render(<ThemeModeProvider storage={null}>{ui}</ThemeModeProvider>);

describe('region predicates', () => {
  it('clamps ?region= values to a known key, falling back to world', () => {
    expect(clampRegion('europe')).toBe('europe');
    expect(clampRegion('middleEast')).toBe('middleEast');
    expect(clampRegion('atlantis')).toBe('world');
    expect(clampRegion(null)).toBe('world');
    expect(clampRegion(undefined)).toBe('world');
  });

  it('inRegionBox keeps the legacy boxes and treats world/unknown as unbounded', () => {
    expect(inRegionBox(40, 10, 'europe')).toBe(true);
    expect(inRegionBox(10, 10, 'europe')).toBe(false);
    expect(inRegionBox(40, 50, 'europe')).toBe(false);
    expect(inRegionBox(0, 0, 'world')).toBe(true);
    expect(inRegionBox(0, 0, 'atlantis')).toBe(true);
  });

  it('textInRegion matches region keywords and passes everything in world', () => {
    expect(textInRegion('Protests in Paris today', 'europe')).toBe(true);
    expect(textInRegion('Quiet session', 'europe')).toBe(false);
    expect(textInRegion('anything at all', 'world')).toBe(true);
    expect(textInRegion('', 'world')).toBe(true);
  });
});

describe('layer predicates', () => {
  it('matchesLayerFilter matches label, key and synonyms, and passes a blank query', () => {
    const air = { key: 'air', label: 'Air', color: '#7fe0c0' } as LayerDef;
    expect(matchesLayerFilter(air, '')).toBe(true);
    expect(matchesLayerFilter(air, '  ')).toBe(true);
    expect(matchesLayerFilter(air, 'air')).toBe(true);
    expect(matchesLayerFilter(air, 'opensky')).toBe(true);
    expect(matchesLayerFilter(air, 'zzz')).toBe(false);
  });

  it('passesLayer requires visibility, active region and time window', () => {
    const now = Date.parse('2026-01-01T12:00:00Z');
    const base = {
      visible: { air: true } as Record<string, boolean | undefined>,
      region: 'world' as const,
      timeWindow: 'all' as const,
      now,
    };
    expect(passesLayer({ type: 'air', lat: 0, lng: 0, ts: '2020-01-01T00:00:00Z' }, base)).toBe(true);
    expect(passesLayer({ type: 'air', lat: 0, lng: 0 }, { ...base, visible: { air: false } })).toBe(false);
    expect(passesLayer({ type: 'ghost', lat: 0, lng: 0 }, base)).toBe(false);
    expect(passesLayer({ type: 'air', lat: 0, lng: 10 }, { ...base, region: 'europe' })).toBe(false);
    expect(passesLayer({ type: 'air', lat: 40, lng: 10, ts: '2026-01-01T11:00:00Z' }, { ...base, timeWindow: '1h' })).toBe(true);
    expect(passesLayer({ type: 'air', lat: 40, lng: 10, ts: '2026-01-01T09:00:00Z' }, { ...base, timeWindow: '1h' })).toBe(false);
    expect(passesLayer({ type: 'air', lat: 40, lng: 10 }, { ...base, timeWindow: '1h' })).toBe(true);
  });

  it('exposes the four ordered time windows', () => {
    expect(TIME_WINDOW_LIST).toEqual(['all', '1h', '24h', '7d']);
  });
});

describe('military air layer definition', () => {
  it('lists militaryAir right after air with its own colour, info card and selection label', () => {
    const airIndex = LAYER_DEFS.findIndex((layer) => layer.key === 'air');
    expect(LAYER_DEFS[airIndex + 1]).toEqual({ key: 'militaryAir', label: 'Military air', color: '#8fa7ff' });
    expect(LAYER_INFO.militaryAir).toMatchObject({
      purpose: 'Every military aircraft currently broadcasting ADS-B, plotted at its real position with heading',
      source: 'OpenSky Network account feed plus the adsb.lol military database flag',
      freshness: 'Refreshed every sweep (~15 min)',
      confidence: LAYER_INFO.air!.confidence,
      limitations: LAYER_INFO.air!.limitations,
    });
    expect(SELECTION_GROUP_LABELS.militaryAir).toBe('Military aircraft');
    expect(matchesLayerFilter(LAYER_DEFS[airIndex + 1]!, 'military')).toBe(true);
  });
});

describe('RegionBar', () => {
  function renderBar(overrides: Partial<React.ComponentProps<typeof RegionBar>> = {}) {
    const onRegion = vi.fn();
    const onSearch = vi.fn();
    const utils = renderThemed(
      <RegionBar
        region="world"
        sourcesOk={4}
        sourcesQueried={5}
        markers={3}
        news={2}
        onRegion={onRegion}
        onSearch={onSearch}
        {...overrides}
      />,
    );
    return { ...utils, onRegion, onSearch };
  }

  it('renders the six region buttons with legacy labels and marks the active one', () => {
    renderBar({ region: 'europe' });
    for (const name of ['WORLD', 'AMERICAS', 'EUROPE', 'MIDDLE EAST', 'ASIA PACIFIC', 'AFRICA']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    const europe = screen.getByRole('button', { name: 'EUROPE' });
    expect(europe).toHaveAttribute('aria-pressed', 'true');
    expect(europe).toHaveClass(CLASSES.regionButtonActive);
    expect(screen.getByRole('button', { name: 'WORLD' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'WORLD' })).not.toHaveClass(CLASSES.regionButtonActive);
  });

  it('calls onRegion with the clicked region key', () => {
    const { onRegion } = renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'AMERICAS' }));
    expect(onRegion).toHaveBeenCalledWith('americas');
  });

  it('fires onSearch on Enter with the typed query and ignores other keys', () => {
    const { onSearch } = renderBar();
    const input = screen.getByPlaceholderText('Search place, event, channel') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'kyiv' } });
    fireEvent.keyDown(input, { key: 'a' });
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('kyiv');
  });

  it('renders the live dot, meta line and hint', () => {
    const { container } = renderBar();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(container.querySelector(`.${CLASSES.barDot}`)).not.toBeNull();
    expect(screen.getByText('4/5 sources · 3 markers · 2 news')).toBeInTheDocument();
    expect(screen.getByText('Scroll to zoom · drag to pan')).toBeInTheDocument();
  });
});

describe('MapLegend', () => {
  function renderLegend(overrides: Partial<React.ComponentProps<typeof MapLegend>> = {}) {
    const handlers = {
      onToggleLayer: vi.fn(),
      onSetAll: vi.fn(),
      onSetTimeWindow: vi.fn(),
      onClearRegion: vi.fn(),
      onInfo: vi.fn(),
    };
    const utils = renderThemed(
      <MapLegend
        region="world"
        layerCounts={{ air: 5, thermal: 0, conflict: 3 }}
        visible={{ air: true, conflict: false }}
        timeWindow="all"
        {...handlers}
        {...overrides}
      />,
    );
    return { ...utils, ...handlers };
  }

  it('renders a chip only for layers with a positive count, marking hidden ones off', () => {
    const { container } = renderLegend();
    const chips = container.querySelectorAll(`.${CLASSES.legendChip}`);
    expect(chips).toHaveLength(2);
    const air = container.querySelector('[data-layer="air"]')!;
    const conflict = container.querySelector('[data-layer="conflict"]')!;
    expect(container.querySelector('[data-layer="thermal"]')).toBeNull();
    expect(air).not.toHaveClass(CLASSES.legendChipOff);
    expect(conflict).toHaveClass(CLASSES.legendChipOff);
    expect(air.querySelector(`.${CLASSES.legendDot}`)).toHaveStyle({ background: '#7fe0c0' });
    expect(air.querySelector(`.${CLASSES.legendCount}`)!.textContent).toBe('5');
  });

  it('shows the live military aircraft count on its own chip', () => {
    const { container } = renderLegend({ layerCounts: { air: 5, militaryAir: 136 }, visible: { air: true, militaryAir: true } });
    const chip = container.querySelector('[data-layer="militaryAir"]')!;
    expect(chip.textContent).toContain('Military air');
    expect(chip.querySelector(`.${CLASSES.legendCount}`)!.textContent).toBe('136');
    expect(chip.querySelector(`.${CLASSES.legendDot}`)).toHaveStyle({ background: '#8fa7ff' });
  });

  it('toggles a layer and opens layer info', () => {
    const { container, onToggleLayer, onInfo } = renderLegend();
    fireEvent.click(container.querySelector('[data-layer="air"]')!);
    expect(onToggleLayer).toHaveBeenCalledWith('air');

    fireEvent.click(container.querySelector(`[data-layer="air"] .${CLASSES.legendInfo}`)!);
    expect(onInfo).toHaveBeenCalledWith('air');
    expect(onToggleLayer).toHaveBeenCalledTimes(1);
  });

  it('fires All / None callbacks', () => {
    const { onSetAll } = renderLegend();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onSetAll).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(onSetAll).toHaveBeenCalledWith(false);
  });

  it('shows the clear-region chip only off world and fires onClearRegion', () => {
    const world = renderLegend();
    expect(world.container.querySelector(`.${CLASSES.legendRegion}`)).toBeNull();
    cleanup();

    const { onClearRegion } = renderLegend({ region: 'europe' });
    fireEvent.click(screen.getByRole('button', { name: /Europe/ }));
    expect(onClearRegion).toHaveBeenCalledTimes(1);
  });

  it('marks the active time window and fires onSetTimeWindow', () => {
    const { onSetTimeWindow } = renderLegend({ timeWindow: '24h' });
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '24h' })).toHaveClass(CLASSES.legendTimeOn);
    fireEvent.click(screen.getByRole('button', { name: '1h' }));
    expect(onSetTimeWindow).toHaveBeenCalledWith('1h');
  });

  it('hides non-matching chips as the filter query is typed', () => {
    const { container } = renderLegend();
    const input = screen.getByPlaceholderText('Filter layers');
    fireEvent.change(input, { target: { value: 'air' } });
    expect(container.querySelector('[data-layer="air"]')).not.toBeNull();
    expect(container.querySelector('[data-layer="conflict"]')).toBeNull();

    fireEvent.change(input, { target: { value: 'clash' } });
    expect(container.querySelector('[data-layer="air"]')).toBeNull();
    expect(container.querySelector('[data-layer="conflict"]')).not.toBeNull();
  });
});

describe('LayerInfoOverlay', () => {
  it('renders nothing without a layer key or info', () => {
    renderThemed(<LayerInfoOverlay layerKey={null} info={null} />);
    expect(document.querySelector('#layerOverlay')).toBeNull();
  });

  it('renders the title and every info section from LAYER_INFO', () => {
    const onClose = vi.fn();
    renderThemed(<LayerInfoOverlay layerKey="news" info={LAYER_INFO.news!} onClose={onClose} />);
    expect(document.querySelector('#layerOverlay')).not.toBeNull();
    expect(screen.getByText('News')).toBeInTheDocument();
    expect(screen.getByText('Geolocated world-news headlines.')).toBeInTheDocument();
    expect(screen.getByText('Purpose')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Freshness')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('Limitations')).toBeInTheDocument();
    expect(screen.getByText('Geocoding can be approximate · Duplicate framing across outlets')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close layer info' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
