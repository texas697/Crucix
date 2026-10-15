// The dashboard map surface (P4b). Owns exactly one MapLibre `Map` for the component's lifetime and
// ports the legacy `initMap()` / `setupMapLayers()` / `applyMapData()` / `renderLabels()` behaviour
// from `jarvis.html`.
//
// Only the surface is ported here. Drawing tools, popups, selections, satellite propagation and the
// region/legend UI live in the legacy dashboard and are driven by the caller through props and the
// imperative handle.

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useRef,
} from 'react';
import maplibregl from 'maplibre-gl';
import type {
  GeoJSONSource, GeoJSONSourceSpecification, LayerSpecification, Map as MaplibreMap,
} from 'maplibre-gl';
import { basemapForTheme, MAP_LAYERS, MAP_SOURCES } from './mapLayers';
import {
  circleFeature,
  emptyDrawState,
  featureToShape,
  haversineKm,
  polyFeature,
  rectFeature,
  type DrawState,
  type DrawTool,
  type LngLat,
} from './selection';
import type { Shape } from '../../state/url';
import type { Theme } from '../../shared/theme';

export interface MapViewHandle {
  resize(): void;
  flyToRegion(region: string): void;
  flyToPoint(lng: number, lat: number, zoom?: number): void;
  getMap(): MaplibreMap | null;
  /** Project a lng/lat to container pixels (legacy `map.project`), or null before load. */
  project(lng: number, lat: number): { x: number; y: number } | null;
  /** Enable/disable drag-pan (the popup and draw tools use this). */
  enableDragPan(enabled: boolean): void;
}

export interface MapLabel {
  text: string;
  anchor: [number, number];
  region?: string;
}

/** The subset of a rendered feature's properties the popup reads (legacy `feats[0].properties`). */
export interface PopupFeature {
  head?: string;
  text?: string;
  meta?: string;
  url?: string;
  isNew?: boolean;
  [key: string]: unknown;
}

/** The payload `onCanvasClick` hands the caller for a non-draw click. */
export interface CanvasClickInfo {
  lng: number;
  lat: number;
  features: PopupFeature[];
  /** The nearest plotted marker `[lng, lat]` within ~25 km, legacy `nearestMapPoint`. */
  point?: [number, number];
}

export interface MapViewProps {
  theme: Theme;
  points: GeoJSON.FeatureCollection;
  labels: MapLabel[];
  rings: GeoJSON.FeatureCollection;
  trails: GeoJSON.FeatureCollection;
  spaceTrack?: GeoJSON.FeatureCollection;
  region: string;
  /** Highlighted selection markers (legacy `src-selected`). */
  selected?: GeoJSON.FeatureCollection;
  /** The armed draw tool; null disarms and clears the preview (legacy `drawTool`). */
  drawTool?: DrawTool | null;
  /** Called with the finished circle/rect/poly shape (legacy `runSelection`'s shape). */
  onDrawComplete?: (shape: Shape) => void;
  /** Called when a draw is disarmed without producing a shape. */
  onDrawCancel?: () => void;
  onReady?: () => void;
  onCanvasClick?: (info: CanvasClickInfo) => void;
}

// Legacy `flatRegionBounds` (jarvis.html ~2230-2233). `world` is handled by flyTo in flyToRegion.
const REGION_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  world: [[-180, -60], [180, 80]],
  americas: [[-130, 5], [-55, 55]],
  europe: [[-12, 34], [45, 72]],
  middleEast: [[24, 10], [65, 45]],
  asiaPacific: [[60, -12], [180, 55]],
  africa: [[-20, -36], [55, 38]],
};

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

/** Nearest plotted Point feature `[lng, lat]` within ~25 km (legacy `nearestMapPoint`). */
function nearestPointFeature(
  fc: GeoJSON.FeatureCollection | undefined,
  lng: number,
  lat: number,
): [number, number] | undefined {
  if (!fc) return undefined;
  let best: [number, number] | undefined;
  let bd = 0.25;
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g || g.type !== 'Point') continue;
    const c = g.coordinates as [number, number];
    const d = Math.hypot(c[1] - lat, c[0] - lng);
    if (d < bd) {
      bd = d;
      best = [c[0], c[1]];
    }
  }
  return best;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(props, ref) {
  const { theme, labels } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const readyRef = useRef(false);
  const styleReloadRef = useRef(false);
  // The live draw state (legacy `drawing`/`drawStart`/`drawPoly`/`drawGeo`), mutated by the mouse handlers.
  const drawRef = useRef<DrawState>(emptyDrawState());
  // The currently applied basemap URL; guards the initial theme effect against a pointless setStyle.
  const styleRef = useRef<string>(basemapForTheme(theme));

  // Latest props for the long-lived map callbacks (they close over the first render's values).
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; });

  const ensureSourcesAndLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const id of MAP_SOURCES) {
      if (!map.getSource(id)) {
        map.addSource(id, { type: 'geojson', data: emptyFC() } as GeoJSONSourceSpecification);
      }
    }
    for (const layer of MAP_LAYERS) {
      if (!map.getLayer(layer.id)) map.addLayer(layer as unknown as LayerSpecification);
    }
  }, []);

  // Null-guard every source before setData: the legacy reader throws mid-style-reload when the source
  // is momentarily gone.
  const setSource = useCallback((id: string, data: GeoJSON.FeatureCollection | undefined) => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(id) as GeoJSONSource | undefined;
    if (src && typeof src.setData === 'function') src.setData(data ?? emptyFC());
  }, []);

  /** Push the in-progress draw feature into `src-draw` (legacy `drawPreview`). */
  const drawPreview = useCallback(() => {
    const feature = drawRef.current.feature;
    setSource('src-draw', feature ? { type: 'FeatureCollection', features: [feature] } : emptyFC());
  }, [setSource]);

  const applyData = useCallback(() => {
    const current = propsRef.current;
    setSource('src-points', current.points);
    setSource('src-rings', current.rings);
    setSource('src-trails', current.trails);
    setSource('src-space-track', current.spaceTrack);
  }, [setSource]);

  const renderLabels = useCallback(() => {
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    for (const label of propsRef.current.labels) {
      const el = document.createElement('div');
      el.className = 'map-label' + (label.region ? ' agg' : '');
      el.textContent = label.text;
      if (label.region) el.style.cursor = 'pointer';
      const marker = new maplibregl.Marker({ element: el, anchor: 'left' })
        .setLngLat(label.anchor)
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, []);

  // Create the map once per mount. StrictMode's mount -> unmount -> mount cycle removes the first map
  // in cleanup, leaving exactly one live instance (and one set of listeners).
  useEffect(() => {
    const map = new maplibregl.Map({
      container: 'map',
      style: styleRef.current,
      center: [20, 25], zoom: 1.35, minZoom: 0.5, maxZoom: 12,
      renderWorldCopies: true, attributionControl: false,
      dragRotate: false, pitchWithRotate: false, touchPitch: false,
    });
    mapRef.current = map;
    readyRef.current = false;

    // Phones hide per-feature labels until zoomed in; see the legacy max-width:640px CSS rule.
    const zoomClass = () => {
      const container = map.getContainer();
      if (container && container.classList) container.classList.toggle('zoomed-in', map.getZoom() >= 2);
    };

    const onLoad = () => {
      readyRef.current = true;
      ensureSourcesAndLayers();
      applyData();
      renderLabels();
      zoomClass();
      propsRef.current.onReady?.();
    };

    // Re-add the custom layers after any styledata that is not part of a theme swap.
    const onStyledata = () => {
      if (readyRef.current && !styleReloadRef.current) ensureSourcesAndLayers();
    };

    // A finished draw: publish the preview and hand the shape to the caller (legacy `runSelection`).
    const completeDraw = (feature: ReturnType<typeof circleFeature>) => {
      drawRef.current.feature = feature;
      drawRef.current.poly = [];
      drawRef.current.start = null;
      drawPreview();
      propsRef.current.onDrawComplete?.(featureToShape(feature));
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const tool = propsRef.current.drawTool ?? null;
      // Polygon builds up on each click; the double-click closes it (legacy click handler).
      if (tool === 'poly') {
        drawRef.current.poly.push([e.lngLat.lng, e.lngLat.lat]);
        drawRef.current.feature = polyFeature(drawRef.current.poly);
        drawPreview();
        return;
      }
      if (tool) return;
      const cb = propsRef.current.onCanvasClick;
      if (!cb) return;
      const layers = ['lyr-points', 'lyr-conflict', 'lyr-rings', 'lyr-corridors'].filter((id) => map.getLayer(id));
      const hits = layers.length ? map.queryRenderedFeatures(e.point, { layers }) : [];
      const features: PopupFeature[] = (hits ? Array.from(hits) : []).map((hit) => {
        const p = (hit.properties || {}) as Record<string, unknown>;
        return {
          head: typeof p.head === 'string' ? p.head : undefined,
          text: typeof p.text === 'string' ? p.text : undefined,
          meta: typeof p.meta === 'string' ? p.meta : undefined,
          url: typeof p.url === 'string' ? p.url : undefined,
          isNew: p.isNew === '1',
        };
      });
      cb({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        features,
        point: nearestPointFeature(propsRef.current.points, e.lngLat.lng, e.lngLat.lat),
      });
    };

    const onDblClick = () => {
      if ((propsRef.current.drawTool ?? null) !== 'poly') return;
      if (drawRef.current.poly.length >= 3) completeDraw(polyFeature(drawRef.current.poly));
    };

    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      const tool = propsRef.current.drawTool ?? null;
      if (!tool || tool === 'poly') return;
      drawRef.current.drawing = true;
      drawRef.current.start = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (map.dragPan) map.dragPan.disable();
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const state = drawRef.current;
      if (!state.drawing || !state.start) return;
      const end: LngLat = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      const tool = propsRef.current.drawTool ?? null;
      if (tool === 'circle') state.feature = circleFeature(state.start, haversineKm(state.start, end));
      else if (tool === 'rect') state.feature = rectFeature(state.start, end);
      drawPreview();
    };

    const onMouseUp = (e: maplibregl.MapMouseEvent) => {
      const state = drawRef.current;
      if (!state.drawing) return;
      state.drawing = false;
      const start = state.start;
      const end: LngLat = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      const tool = propsRef.current.drawTool ?? null;
      let feature: ReturnType<typeof circleFeature> | null = null;
      if (start && tool === 'circle') {
        const r = haversineKm(start, end);
        if (r > 3) feature = circleFeature(start, r);
      } else if (start && tool === 'rect') {
        if (Math.abs(end.lat - start.lat) > 0.2 || Math.abs(end.lng - start.lng) > 0.2) feature = rectFeature(start, end);
      }
      state.start = null;
      if (feature) completeDraw(feature);
      else {
        state.feature = null;
        drawPreview();
        propsRef.current.onDrawCancel?.();
      }
    };

    map.on('load', onLoad);
    map.on('styledata', onStyledata);
    map.on('zoomend', zoomClass);
    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    // The legacy swallows map errors; keep that until there is somewhere to surface them.
    map.on('error', () => {});

    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      readyRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, [ensureSourcesAndLayers, applyData, renderLabels, drawPreview]);

  // Theme change: swap the basemap, then re-add sources/layers and re-apply data once the style idles
  // (the legacy applyThemeToMap -> setStyle -> once('idle', setupMapLayers + plotMarkers)).
  useEffect(() => {
    const map = mapRef.current;
    const next = basemapForTheme(theme);
    if (!map || next === styleRef.current) return;
    styleRef.current = next;
    styleReloadRef.current = true;
    map.setStyle(next);
    map.once('idle', () => {
      ensureSourcesAndLayers();
      applyData();
      styleReloadRef.current = false;
    });
  }, [theme, ensureSourcesAndLayers, applyData]);

  // Arm/disarm a draw tool (legacy `setDrawTool`): reset the in-progress draw, swap the cursor and
  // lock panning while a tool is active. Disarming clears the `src-draw` preview.
  useEffect(() => {
    const tool = props.drawTool ?? null;
    drawRef.current = { ...drawRef.current, drawing: false, start: null, poly: [] };
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas?.();
    if (canvas?.style) canvas.style.cursor = tool ? 'crosshair' : 'grab';
    if (map.dragPan) {
      if (tool) map.dragPan.disable();
      else map.dragPan.enable();
    }
    if (!tool) {
      drawRef.current.feature = null;
      drawPreview();
    }
  }, [props.drawTool, drawPreview]);

  // Push the selection highlight into `src-selected` (legacy `reselect`).
  useEffect(() => { setSource('src-selected', props.selected); }, [props.selected, setSource]);

  // Push data to the sources whenever the props change (no-op until the map has loaded).
  useEffect(() => { setSource('src-points', props.points); }, [props.points, setSource]);
  useEffect(() => { setSource('src-rings', props.rings); }, [props.rings, setSource]);
  useEffect(() => { setSource('src-trails', props.trails); }, [props.trails, setSource]);
  useEffect(() => { setSource('src-space-track', props.spaceTrack); }, [props.spaceTrack, setSource]);

  useEffect(() => { renderLabels(); }, [labels, renderLabels]);

  // Keep the canvas sized to its container.
  useEffect(() => {
    const onResize = () => mapRef.current?.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const el = containerRef.current;
    const observer = el && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => mapRef.current?.resize())
      : null;
    if (el && observer) observer.observe(el);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      observer?.disconnect();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    resize() { mapRef.current?.resize(); },
    flyToRegion(region: string) {
      const map = mapRef.current;
      if (!map) return;
      if (region === 'world') {
        map.flyTo({ center: [20, 25], zoom: 1.35 });
        return;
      }
      const box = REGION_BOUNDS[region];
      if (box) map.fitBounds(box);
    },
    flyToPoint(lng: number, lat: number, zoom = 5) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom });
    },
    getMap() { return mapRef.current; },
    project(lng: number, lat: number) {
      const map = mapRef.current;
      if (!map || typeof map.project !== 'function') return null;
      const p = map.project({ lng, lat });
      return { x: p.x, y: p.y };
    },
    enableDragPan(enabled: boolean) {
      const map = mapRef.current;
      if (!map || !map.dragPan) return;
      if (enabled) map.dragPan.enable();
      else map.dragPan.disable();
    },
  }), []);

  return <div id="map" ref={containerRef} />;
});
