import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { clampRegion, inRegionBox, textInRegion } from '../../dashboard/react/features/map/regions';
import {
  LAYER_INFO,
  TIME_WINDOW_LIST,
  matchesLayerFilter,
  passesLayer,
  type LayerDef,
} from '../../dashboard/react/features/map/layerDefs';
import { RegionBar } from '../../dashboard/react/features/map/RegionBar';
import { LayerInfoOverlay, MapLegend } from '../../dashboard/react/features/map/MapLegend';

afterEach(cleanup);

describe('region predicates', () => {
  it('clamps ?region= values to a known key, falling back to world', () => {
    expect(clampRegion('europe')).toBe('europe');
    expect(clampRegion('middleEast')).toBe('middleEast');
    expect(clampRegion('atlantis')).toBe('world');
    expect(clampRegion(null)).toBe('world');
    expect(clampRegion(undefined)).toBe('world');
  });

  it('inRegionBox keeps the legacy boxes and treats world/unknown as unbounded', () => {
    // Inside the europe box [[-25,33],[45,72]].
    expect(inRegionBox(40, 10, 'europe')).toBe(true);
    // Latitude below the europe box.
    expect(inRegionBox(10, 10, 'europe')).toBe(false);
    // Longitude east of the europe box.
    expect(inRegionBox(40, 50, 'europe')).toBe(false);
    // World (and unknown regions) filter nothing.
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
    // Hidden layer fails.
    expect(passesLayer({ type: 'air', lat: 0, lng: 0 }, { ...base, visible: { air: false } })).toBe(false);
    // Unknown layer (undefined visibility) fails, mirroring the legacy global default.
    expect(passesLayer({ type: 'ghost', lat: 0, lng: 0 }, base)).toBe(false);
    // Out of the active region fails.
    expect(passesLayer({ type: 'air', lat: 0, lng: 10 }, { ...base, region: 'europe' })).toBe(false);
    // A timestamp older than the window fails; a recent one passes.
    expect(passesLayer({ type: 'air', lat: 40, lng: 10, ts: '2026-01-01T11:00:00Z' }, { ...base, timeWindow: '1h' })).toBe(true);
    expect(passesLayer({ type: 'air', lat: 40, lng: 10, ts: '2026-01-01T09:00:00Z' }, { ...base, timeWindow: '1h' })).toBe(false);
    // Missing timestamp always passes the time check (legacy `!ts`).
    expect(passesLayer({ type: 'air', lat: 40, lng: 10 }, { ...base, timeWindow: '1h' })).toBe(true);
  });

  it('exposes the four ordered time windows', () => {
    expect(TIME_WINDOW_LIST).toEqual(['all', '1h', '24h', '7d']);
  });
});

describe('RegionBar', () => {
  function renderBar(overrides: Partial<React.ComponentProps<typeof RegionBar>> = {}) {
    const onRegion = vi.fn();
    const onSearch = vi.fn();
    const utils = render(
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
    expect(screen.getByRole('button', { name: 'EUROPE' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'WORLD' })).not.toHaveClass('active');
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
    renderBar();
    expect(screen.getByText('Live')).toBeInTheDocument();
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
    const utils = render(
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
    const chips = container.querySelectorAll('.leg-chip');
    expect(chips).toHaveLength(2);
    const air = container.querySelector('[data-layer="air"]')!;
    const conflict = container.querySelector('[data-layer="conflict"]')!;
    expect(container.querySelector('[data-layer="thermal"]')).toBeNull();
    expect(air).not.toHaveClass('off');
    expect(conflict).toHaveClass('off');
    expect(conflict.querySelector('.leg-dot')).toHaveStyle({ background: '#f59a5e' });
  });

  it('toggles a layer and opens layer info', () => {
    const { container, onToggleLayer, onInfo } = renderLegend();
    fireEvent.click(container.querySelector('[data-layer="air"]')!);
    expect(onToggleLayer).toHaveBeenCalledWith('air');

    fireEvent.click(container.querySelector('[data-layer="air"] .leg-info')!);
    expect(onInfo).toHaveBeenCalledWith('air');
    // The nested i button must not also toggle the chip.
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
    expect(world.container.querySelector('.leg-region')).toBeNull();
    cleanup();

    const { onClearRegion } = renderLegend({ region: 'europe' });
    const chip = screen.getByRole('button', { name: /Europe/ });
    fireEvent.click(chip);
    expect(onClearRegion).toHaveBeenCalledTimes(1);
  });

  it('marks the active time window and fires onSetTimeWindow', () => {
    const { onSetTimeWindow } = renderLegend({ timeWindow: '24h' });
    expect(screen.getByRole('button', { name: 'All time' })).not.toHaveClass('on');
    expect(screen.getByRole('button', { name: '24h' })).toHaveClass('on');
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
    const { container } = render(<LayerInfoOverlay layerKey={null} info={null} />);
    expect(container.querySelector('#layerOverlay')).toBeNull();
  });

  it('renders the title and every info section from LAYER_INFO', () => {
    const onClose = vi.fn();
    render(<LayerInfoOverlay layerKey="news" info={LAYER_INFO.news!} onClose={onClose} />);
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
