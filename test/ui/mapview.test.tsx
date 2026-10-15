import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createRef, StrictMode } from 'react';
import { BASEMAPS, basemapForTheme, MAP_LAYERS, MAP_SOURCES } from '../../dashboard/react/features/map/mapLayers';
import { CLASSES } from '../../dashboard/react/features/map/classes';
import { PLANE_ICON_ID } from '../../dashboard/react/features/map/consts';
import { MapView } from '../../dashboard/react/features/map/MapView';
import type { MapViewHandle, MapViewProps } from '../../dashboard/react/features/map/MapView';

// jsdom has no WebGL, so `react-map-gl/maplibre` is replaced by a recording fake: the <Map> stores
// its props (so the test can fire onLoad / pointer callbacks by hand) and hands a fake MapLibre
// instance to the ref; <Source>/<Layer> record what they would add; <Marker> renders its child.
const h = vi.hoisted(() => {
  class FakeMapInstance {
    flyToCalls: Array<Record<string, unknown>> = [];
    fitBoundsCalls: unknown[] = [];
    resizeCalls = 0;
    images = new Map<string, unknown>();
    listeners = new Map<string, Array<(ev: unknown) => void>>();
    zoom = 1.35;
    layerIds = ['lyr-points', 'lyr-military', 'lyr-conflict', 'lyr-rings'];
    hits: Array<{ properties: Record<string, unknown> }> = [];
    dragPan = { enable: vi.fn(), disable: vi.fn() };
    getMap() { return this; }
    flyTo(options: Record<string, unknown>) { this.flyToCalls.push(options); }
    fitBounds(bounds: unknown) { this.fitBoundsCalls.push(bounds); }
    resize() { this.resizeCalls += 1; }
    project({ lng, lat }: { lng: number; lat: number }) { return { x: lng * 10, y: lat * 10 }; }
    getZoom() { return this.zoom; }
    getContainer() { return document.createElement('div'); }
    hasImage(id: string) { return this.images.has(id); }
    addImage(id: string, image: unknown, options: unknown) { this.images.set(id, { image, options }); }
    on(type: string, cb: (ev: unknown) => void) {
      const list = this.listeners.get(type) ?? [];
      list.push(cb);
      this.listeners.set(type, list);
      return this;
    }
    off(type: string, cb: (ev: unknown) => void) {
      this.listeners.set(type, (this.listeners.get(type) ?? []).filter((x) => x !== cb));
      return this;
    }
    fire(type: string, ev: unknown) { for (const cb of this.listeners.get(type) ?? []) cb(ev); }
    getLayer(id: string) { return this.layerIds.includes(id) ? { id } : undefined; }
    queryRenderedFeatures() { return this.hits; }
  }
  const state = {
    instance: new FakeMapInstance(),
    mapProps: null as Record<string, any> | null,
    sources: new Map<string, any>(),
    layers: new Map<string, any>(),
    mapCount: 0,
  };
  return { FakeMapInstance, state };
});

vi.mock('react-map-gl/maplibre', async () => {
  const React = await import('react');
  const Map = React.forwardRef((props: any, ref) => {
    h.state.mapProps = props;
    React.useImperativeHandle(ref, () => h.state.instance, []);
    React.useEffect(() => {
      h.state.mapCount += 1;
      return () => { h.state.mapCount -= 1; };
    }, []);
    return React.createElement('div', { id: props.id, 'data-testid': 'fake-map' }, props.children);
  });
  const Source = (props: any) => {
    h.state.sources.set(props.id, props);
    return props.children ?? null;
  };
  const Layer = (props: any) => {
    h.state.layers.set(props.id, props);
    return null;
  };
  const Marker = (props: any) => React.createElement(
    'div',
    { 'data-marker': '', 'data-lng': props.longitude, 'data-lat': props.latitude, 'data-anchor': props.anchor },
    props.children,
  );
  const Popup = (props: any) => React.createElement('div', null, props.children);
  const NavigationControl = () => null;
  const useMap = () => ({ current: h.state.instance });
  return { default: Map, Map, Source, Layer, Marker, Popup, NavigationControl, useMap };
});

// The plane icon is loaded through an <img>; jsdom never fires onload, so a fake Image fires it as
// soon as src is set.
class FakeImage {
  onload: null | (() => void) = null;
  width: number;
  height: number;
  private srcValue = '';
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
  }
  set src(value: string) {
    this.srcValue = value;
    this.onload?.();
  }
  get src() { return this.srcValue; }
}

function fc(features: GeoJSON.Feature[] = []): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features };
}

function point(lng: number, lat: number): GeoJSON.Feature {
  return { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } };
}

const mouse = (lng: number, lat: number) => ({ lngLat: { lng, lat }, point: { x: 0, y: 0 } });

const baseProps: MapViewProps = { theme: 'dark', points: fc(), labels: [], rings: fc(), trails: fc(), region: 'world' };

function load() {
  act(() => { h.state.mapProps?.onLoad({ target: h.state.instance }); });
}

function props() {
  return h.state.mapProps!;
}

beforeEach(() => {
  h.state.instance = new h.FakeMapInstance();
  h.state.mapProps = null;
  h.state.sources.clear();
  h.state.layers.clear();
  h.state.mapCount = 0;
  vi.stubGlobal('Image', FakeImage);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MapView map options', () => {
  it('renders one uncontrolled map with the legacy init options', () => {
    render(<MapView {...baseProps} />);
    expect(props()).toMatchObject({
      id: 'map',
      mapStyle: basemapForTheme('dark'),
      initialViewState: { longitude: 20, latitude: 25, zoom: 1.35 },
      minZoom: 0.5,
      maxZoom: 12,
      renderWorldCopies: true,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      dragPan: true,
      cursor: 'grab',
    });
    expect(props().viewState).toBeUndefined();
    expect(props().mapStyle).toBe(BASEMAPS[0].style);
  });

  it('swaps the basemap when the theme changes', () => {
    const { rerender } = render(<MapView {...baseProps} />);
    rerender(<MapView {...baseProps} theme="light" />);
    expect(props().mapStyle).toBe(basemapForTheme('light'));
    expect(props().mapStyle).toBe(BASEMAPS[2].style);
  });

  it('leaves exactly one live map under StrictMode and calls onReady on load', () => {
    const onReady = vi.fn();
    render(<StrictMode><MapView {...baseProps} onReady={onReady} /></StrictMode>);
    expect(h.state.mapCount).toBe(1);
    load();
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

describe('MapView sources and layers', () => {
  it('declares the 8 sources and 10 layers in legacy z-order', () => {
    render(<MapView {...baseProps} />);
    expect([...h.state.sources.keys()]).toEqual([...MAP_SOURCES]);
    expect([...h.state.layers.keys()]).toEqual(MAP_LAYERS.map((layer) => layer.id));
    for (const layer of MAP_LAYERS) expect(h.state.layers.get(layer.id).source).toBe(layer.source);
    expect(h.state.sources.get('src-corridors')).toMatchObject({ type: 'geojson', data: fc() });
  });

  it('renders militaryAir as a tinted sdf plane symbol rotated by heading with a zoom-4 label', () => {
    render(<MapView {...baseProps} />);
    const military = h.state.layers.get('lyr-military');
    expect(military).toMatchObject({
      type: 'symbol',
      source: 'src-points',
      filter: ['==', ['get', 'type'], 'militaryAir'],
      layout: {
        'icon-image': PLANE_ICON_ID,
        'icon-size': 0.3,
        'icon-rotate': ['coalesce', ['get', 'heading'], 0],
        'icon-rotation-alignment': 'map',
      },
      paint: { 'icon-color': '#8fa7ff' },
    });
    expect(military.layout['text-field']).toEqual(['step', ['zoom'], '', 4, ['coalesce', ['get', 'label'], '']]);
    expect(h.state.layers.get('lyr-points').filter).toEqual(['!=', ['get', 'type'], 'militaryAir']);
    const ids = [...h.state.layers.keys()];
    expect(ids.indexOf('lyr-military')).toBe(ids.indexOf('lyr-points') + 1);
  });

  it('feeds points/rings/trails/spaceTrack/selected into their sources and follows prop changes', () => {
    const points = fc([point(1, 2)]);
    const rings = fc([point(3, 4)]);
    const trails = fc([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }]);
    const spaceTrack = fc([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[2, 2], [3, 3]] } }]);
    const selected = fc([point(5, 6)]);
    const { rerender } = render(
      <MapView {...baseProps} points={points} rings={rings} trails={trails} spaceTrack={spaceTrack} selected={selected} />,
    );
    expect(h.state.sources.get('src-points').data).toBe(points);
    expect(h.state.sources.get('src-rings').data).toBe(rings);
    expect(h.state.sources.get('src-trails').data).toBe(trails);
    expect(h.state.sources.get('src-space-track').data).toBe(spaceTrack);
    expect(h.state.sources.get('src-selected').data).toBe(selected);

    const next = fc([point(9, 9)]);
    rerender(<MapView {...baseProps} points={next} rings={rings} trails={trails} spaceTrack={spaceTrack} selected={selected} />);
    expect(h.state.sources.get('src-points').data).toBe(next);
  });
});

describe('MapView labels', () => {
  it('renders labels as left-anchored markers with aggregate and zoom modifiers', () => {
    const { container, rerender } = render(
      <MapView {...baseProps} labels={[{ text: 'Alpha', anchor: [1, 2] }, { text: 'Beta', anchor: [3, 4], region: 'europe' }]} />,
    );
    load();
    const markers = container.querySelectorAll('[data-marker]');
    expect(markers).toHaveLength(2);
    expect(markers[0]!.getAttribute('data-anchor')).toBe('left');
    expect(markers[0]!.getAttribute('data-lng')).toBe('1');
    expect(markers[0]!.textContent).toBe('Alpha');
    const alpha = markers[0]!.firstElementChild!;
    const beta = markers[1]!.firstElementChild!;
    expect(alpha).toHaveClass(CLASSES.label);
    expect(alpha).not.toHaveClass(CLASSES.labelAgg);
    expect(alpha).not.toHaveClass(CLASSES.labelZoomed);
    expect(beta).toHaveClass(CLASSES.labelAgg);

    h.state.instance.zoom = 3;
    act(() => { props().onZoomEnd(); });
    expect(container.querySelector(`.${CLASSES.label}`)).toHaveClass(CLASSES.labelZoomed);

    rerender(<MapView {...baseProps} labels={[{ text: 'Gamma', anchor: [5, 6] }]} />);
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(1);
    expect(container.textContent).toContain('Gamma');
  });
});

describe('MapView plane icon', () => {
  it('registers the sdf plane image on load and again when the style drops it', () => {
    render(<MapView {...baseProps} />);
    expect(h.state.instance.images.size).toBe(0);
    load();
    expect(h.state.instance.images.get(PLANE_ICON_ID)).toMatchObject({ options: { sdf: true } });
    h.state.instance.images.clear();
    act(() => { h.state.instance.fire('styleimagemissing', { id: PLANE_ICON_ID }); });
    expect(h.state.instance.images.has(PLANE_ICON_ID)).toBe(true);
  });
});

describe('MapView imperative handle', () => {
  it('resizes, flies, fits regions, projects and toggles drag-pan through the ref', () => {
    const ref = createRef<MapViewHandle>();
    render(<MapView ref={ref} {...baseProps} />);
    const map = h.state.instance;

    act(() => ref.current?.resize());
    expect(map.resizeCalls).toBe(1);
    act(() => ref.current?.flyToPoint(4, 5));
    expect(map.flyToCalls.at(-1)).toMatchObject({ center: [4, 5], zoom: 5 });
    act(() => ref.current?.flyToRegion('europe'));
    expect(map.fitBoundsCalls.at(-1)).toEqual([[-12, 34], [45, 72]]);
    act(() => ref.current?.flyToRegion('world'));
    expect(map.flyToCalls.at(-1)).toMatchObject({ center: [20, 25], zoom: 1.35 });
    expect(ref.current?.getMap()).toBe(map);
    expect(ref.current?.project(1, 2)).toEqual({ x: 10, y: 20 });
    act(() => ref.current?.enableDragPan(false));
    expect(map.dragPan.disable).toHaveBeenCalledTimes(1);
  });
});

describe('MapView draw tools', () => {
  it('arms the cursor and disables panning while a tool is active', () => {
    const { rerender } = render(<MapView {...baseProps} />);
    rerender(<MapView {...baseProps} drawTool="circle" />);
    expect(props()).toMatchObject({ cursor: 'crosshair', dragPan: false });
  });

  it('draws a circle on drag, previews it and hands the shape to onDrawComplete', () => {
    const onDrawComplete = vi.fn();
    render(<MapView {...baseProps} drawTool="circle" onDrawComplete={onDrawComplete} />);
    act(() => { props().onMouseDown(mouse(10, 10)); });
    act(() => { props().onMouseMove(mouse(11, 10)); });
    expect(h.state.sources.get('src-draw').data.features).toHaveLength(1);
    act(() => { props().onMouseUp(mouse(12, 10)); });
    expect(onDrawComplete).toHaveBeenCalledTimes(1);
    const shape = onDrawComplete.mock.calls[0]![0];
    expect(shape.kind).toBe('circle');
    expect(shape.center).toEqual({ lat: 10, lng: 10 });
    expect(shape.radiusKm).toBeGreaterThan(3);
  });

  it('cancels a drag that is too small', () => {
    const onDrawComplete = vi.fn();
    const onDrawCancel = vi.fn();
    render(<MapView {...baseProps} drawTool="circle" onDrawComplete={onDrawComplete} onDrawCancel={onDrawCancel} />);
    act(() => { props().onMouseDown(mouse(10, 10)); });
    act(() => { props().onMouseUp(mouse(10.001, 10)); });
    expect(onDrawComplete).not.toHaveBeenCalled();
    expect(onDrawCancel).toHaveBeenCalledTimes(1);
    expect(h.state.sources.get('src-draw').data.features).toHaveLength(0);
  });

  it('draws a rectangle from the drag corners', () => {
    const onDrawComplete = vi.fn();
    render(<MapView {...baseProps} drawTool="rect" onDrawComplete={onDrawComplete} />);
    act(() => { props().onMouseDown(mouse(0, 0)); });
    act(() => { props().onMouseUp(mouse(2, 3)); });
    expect(onDrawComplete.mock.calls[0]![0]).toMatchObject({ kind: 'rect', sw: { lat: 0, lng: 0 }, ne: { lat: 3, lng: 2 } });
  });

  it('builds a polygon from clicks, closes it on double click and clears when disarmed', () => {
    const onDrawComplete = vi.fn();
    const onCanvasClick = vi.fn();
    const { rerender } = render(
      <MapView {...baseProps} drawTool="poly" onDrawComplete={onDrawComplete} onCanvasClick={onCanvasClick} />,
    );
    act(() => { props().onClick(mouse(0, 0)); });
    act(() => { props().onClick(mouse(1, 0)); });
    act(() => { props().onClick(mouse(1, 1)); });
    expect(onCanvasClick).not.toHaveBeenCalled();
    expect(h.state.sources.get('src-draw').data.features).toHaveLength(1);
    act(() => { props().onDblClick(); });
    expect(onDrawComplete).toHaveBeenCalledTimes(1);
    const shape = onDrawComplete.mock.calls[0]![0];
    expect(shape.kind).toBe('poly');
    expect(shape.ring.length).toBeGreaterThanOrEqual(3);

    rerender(<MapView {...baseProps} drawTool={null} onDrawComplete={onDrawComplete} onCanvasClick={onCanvasClick} />);
    expect(h.state.sources.get('src-draw').data.features).toHaveLength(0);
  });
});

describe('MapView canvas click', () => {
  it('reports rendered hits and the nearest plotted point to onCanvasClick', () => {
    const onCanvasClick = vi.fn();
    h.state.instance.hits = [{ properties: { head: 'H', text: 'T', meta: 'M', url: 'https://x.test/', isNew: '1' } }];
    render(<MapView {...baseProps} points={fc([point(1, 2)])} onCanvasClick={onCanvasClick} />);
    act(() => { props().onClick(mouse(1.1, 2.1)); });
    expect(onCanvasClick).toHaveBeenCalledWith({
      lng: 1.1,
      lat: 2.1,
      features: [{ head: 'H', text: 'T', meta: 'M', url: 'https://x.test/', isNew: true }],
      point: [1, 2],
    });
  });

  it('swallows plain clicks while a shape tool is armed', () => {
    const onCanvasClick = vi.fn();
    render(<MapView {...baseProps} drawTool="circle" onCanvasClick={onCanvasClick} />);
    act(() => { props().onClick(mouse(1, 1)); });
    expect(onCanvasClick).not.toHaveBeenCalled();
  });
});
