import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { createRef, StrictMode } from 'react';
import { BASEMAPS, basemapForTheme, MAP_LAYERS, MAP_SOURCES } from '../../dashboard/react/features/map/mapLayers';
import { MapView } from '../../dashboard/react/features/map/MapView';
import type { MapViewHandle, MapViewProps } from '../../dashboard/react/features/map/MapView';

// jsdom has no WebGL, so the whole point here is the fake `maplibre-gl`: it records every call the
// component makes and lets the test drive the asynchronous `load` / `idle` lifecycle by hand.
const h = vi.hoisted(() => {
  const maps: any[] = [];
  const markers: any[] = [];

  class FakeMap {
    options: Record<string, unknown>;
    sources = new Map<string, { id: string; spec: unknown; setData: ReturnType<typeof vi.fn> }>();
    layers: Array<Record<string, unknown>> = [];
    handlers = new Map<string, Array<(ev?: unknown) => void>>();
    removed = false;
    styleCalls: Array<unknown> = [];
    flyToCalls: Array<Record<string, unknown>> = [];
    fitBoundsCalls: Array<unknown> = [];
    resizeCalls = 0;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      maps.push(this);
    }

    on(type: string, cb: (ev?: unknown) => void) {
      const list = this.handlers.get(type) ?? [];
      list.push(cb);
      this.handlers.set(type, list);
      return this;
    }

    once(type: string, cb: (ev?: unknown) => void) {
      return this.on(type, cb);
    }

    fire(type: string, ev?: unknown) {
      for (const cb of this.handlers.get(type) ?? []) cb(ev);
    }

    addSource(id: string, spec: unknown) {
      this.sources.set(id, { id, spec, setData: vi.fn() });
      return this;
    }

    getSource(id: string) {
      return this.sources.get(id);
    }

    addLayer(layer: Record<string, unknown>) {
      this.layers.push(layer);
      return this;
    }

    getLayer(id: string) {
      return this.layers.some((layer) => layer.id === id) ? { id } : undefined;
    }

    setStyle(style: unknown) {
      this.styleCalls.push(style);
      return this;
    }

    flyTo(options: Record<string, unknown>) {
      this.flyToCalls.push(options);
      return this;
    }

    fitBounds(bounds: unknown) {
      this.fitBoundsCalls.push(bounds);
      return this;
    }

    resize() {
      this.resizeCalls += 1;
      return this;
    }

    queryRenderedFeatures() {
      return [];
    }

    getCanvas() {
      return document.createElement('canvas');
    }

    getContainer() {
      return document.createElement('div');
    }

    getZoom() {
      return 1;
    }

    project() {
      return { x: 0, y: 0 };
    }

    remove() {
      this.removed = true;
      const index = maps.indexOf(this);
      if (index >= 0) maps.splice(index, 1);
    }
  }

  class FakeMarker {
    options: Record<string, unknown>;
    element: HTMLElement;
    lngLat: unknown = null;
    removed = false;

    constructor(options: Record<string, unknown>) {
      this.options = options;
      this.element = options.element as HTMLElement;
      markers.push(this);
    }

    setLngLat(lngLat: unknown) {
      this.lngLat = lngLat;
      return this;
    }

    addTo() {
      return this;
    }

    remove() {
      this.removed = true;
      const index = markers.indexOf(this);
      if (index >= 0) markers.splice(index, 1);
    }
  }

  return { FakeMap, FakeMarker, maps, markers };
});

vi.mock('maplibre-gl', () => ({
  default: { Map: h.FakeMap, Marker: h.FakeMarker },
}));

function fc(features: GeoJSON.Feature[] = []): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features };
}

const baseProps: MapViewProps = {
  theme: 'dark',
  points: fc(),
  labels: [],
  rings: fc(),
  trails: fc(),
  region: 'world',
};

function firstMap() {
  return h.maps[0]!;
}

beforeEach(() => {
  h.maps.length = 0;
  h.markers.length = 0;
});

describe('MapView legacy options', () => {
  it('creates one map with the legacy init options', () => {
    render(<MapView {...baseProps} />);
    expect(h.maps).toHaveLength(1);
    expect(firstMap().options).toMatchObject({
      container: 'map',
      style: basemapForTheme('dark'),
      center: [20, 25],
      zoom: 1.35,
      minZoom: 0.5,
      maxZoom: 12,
      renderWorldCopies: true,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    expect(firstMap().options.style).toBe(BASEMAPS[0].style);
  });
});

describe('MapView layers', () => {
  it('adds the 8 sources and 9 layers on load', () => {
    const onReady = vi.fn();
    render(<MapView {...baseProps} onReady={onReady} />);
    expect(firstMap().sources.size).toBe(0);
    act(() => firstMap().fire('load'));
    expect([...firstMap().sources.keys()]).toEqual([...MAP_SOURCES]);
    expect(firstMap().layers.map((layer: Record<string, unknown>) => layer.id)).toEqual(MAP_LAYERS.map((layer) => layer.id));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('adds each source as an empty geojson source', () => {
    render(<MapView {...baseProps} />);
    act(() => firstMap().fire('load'));
    expect(firstMap().sources.get('src-points')!.spec).toEqual({
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  });
});

describe('MapView data', () => {
  it('pushes points/rings/trails/spaceTrack into their sources', () => {
    const points = fc([{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]);
    const rings = fc([{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [3, 4] } }]);
    const trails = fc([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }]);
    const spaceTrack = fc([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[2, 2], [3, 3]] } }]);

    render(<MapView {...baseProps} points={points} rings={rings} trails={trails} spaceTrack={spaceTrack} />);
    act(() => firstMap().fire('load'));

    expect(firstMap().sources.get('src-points')!.setData).toHaveBeenCalledWith(points);
    expect(firstMap().sources.get('src-rings')!.setData).toHaveBeenCalledWith(rings);
    expect(firstMap().sources.get('src-trails')!.setData).toHaveBeenCalledWith(trails);
    expect(firstMap().sources.get('src-space-track')!.setData).toHaveBeenCalledWith(spaceTrack);
  });

  it('applies prop changes to the already-loaded sources', () => {
    const { rerender } = render(<MapView {...baseProps} points={fc()} />);
    act(() => firstMap().fire('load'));
    const next = fc([{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [9, 9] } }]);
    rerender(<MapView {...baseProps} points={next} />);
    expect(firstMap().sources.get('src-points')!.setData).toHaveBeenLastCalledWith(next);
  });
});

describe('MapView labels', () => {
  it('renders labels as left-anchored map-label markers and clears them on update', () => {
    const { rerender } = render(
      <MapView
        {...baseProps}
        labels={[{ text: 'Alpha', anchor: [1, 2] }, { text: 'Beta', anchor: [3, 4], region: 'europe' }]}
      />,
    );
    act(() => firstMap().fire('load'));
    expect(h.markers).toHaveLength(2);
    expect(h.markers[0]!.options).toMatchObject({ anchor: 'left' });
    expect(h.markers[0]!.element.className).toBe('map-label');
    expect(h.markers[0]!.element.textContent).toBe('Alpha');
    expect(h.markers[1]!.element.className).toBe('map-label agg');
    expect(h.markers[0]!.lngLat).toEqual([1, 2]);

    rerender(<MapView {...baseProps} labels={[{ text: 'Gamma', anchor: [5, 6] }]} />);
    expect(h.markers).toHaveLength(1);
    expect(h.markers[0]!.element.textContent).toBe('Gamma');
    expect(h.maps).toHaveLength(1);
  });
});

describe('MapView lifecycle', () => {
  it('removes the map on unmount', () => {
    const { unmount } = render(<MapView {...baseProps} />);
    const map = firstMap();
    unmount();
    expect(map.removed).toBe(true);
    expect(h.maps).toHaveLength(0);
  });

  it('leaves exactly one live map under StrictMode', () => {
    render(
      <StrictMode>
        <MapView {...baseProps} />
      </StrictMode>,
    );
    // StrictMode double-invokes the effect; the first instance must be removed in cleanup.
    expect(h.maps).toHaveLength(1);
    expect(h.maps[0]!.removed).toBe(false);
  });

  it('calls setStyle when the theme changes and re-applies data on idle', () => {
    const points = fc([{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } }]);
    const { rerender } = render(<MapView {...baseProps} points={points} />);
    act(() => firstMap().fire('load'));
    expect(firstMap().styleCalls).toHaveLength(0);

    rerender(<MapView {...baseProps} theme="light" points={points} />);
    expect(firstMap().styleCalls).toEqual([basemapForTheme('light')]);

    // The legacy re-runs setupMapLayers + plotMarkers on the post-setStyle idle; data is re-applied.
    firstMap().sources.get('src-points')!.setData.mockClear();
    act(() => firstMap().fire('idle'));
    expect(firstMap().sources.get('src-points')!.setData).toHaveBeenCalledWith(points);
  });
});

describe('MapView imperative handle', () => {
  it('resizes, flies to a point and fits a region through the ref', () => {
    const ref = createRef<MapViewHandle>();
    render(<MapView ref={ref} {...baseProps} />);
    act(() => firstMap().fire('load'));

    act(() => ref.current?.resize());
    expect(firstMap().resizeCalls).toBe(1);

    act(() => ref.current?.flyToPoint(4, 5));
    expect(firstMap().flyToCalls.at(-1)).toMatchObject({ center: [4, 5], zoom: 5 });

    act(() => ref.current?.flyToRegion('europe'));
    expect(firstMap().fitBoundsCalls.at(-1)).toEqual([[-12, 34], [45, 72]]);

    act(() => ref.current?.flyToRegion('world'));
    expect(firstMap().flyToCalls.at(-1)).toMatchObject({ center: [20, 25], zoom: 1.35 });

    expect(ref.current?.getMap()).toBe(firstMap());
  });
});
