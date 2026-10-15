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
import type { Theme } from '../../shared/theme';

export interface MapViewHandle {
  resize(): void;
  flyToRegion(region: string): void;
  flyToPoint(lng: number, lat: number, zoom?: number): void;
  getMap(): MaplibreMap | null;
}

export interface MapLabel {
  text: string;
  anchor: [number, number];
  region?: string;
}

export interface MapViewProps {
  theme: Theme;
  points: GeoJSON.FeatureCollection;
  labels: MapLabel[];
  rings: GeoJSON.FeatureCollection;
  trails: GeoJSON.FeatureCollection;
  spaceTrack?: GeoJSON.FeatureCollection;
  region: string;
  onReady?: () => void;
  onCanvasClick?: (lng: number, lat: number, features: unknown[]) => void;
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

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(props, ref) {
  const { theme, labels } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const readyRef = useRef(false);
  const styleReloadRef = useRef(false);
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

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const cb = propsRef.current.onCanvasClick;
      if (!cb) return;
      let features: unknown[] = [];
      const layers = ['lyr-points', 'lyr-conflict', 'lyr-rings', 'lyr-corridors'].filter((id) => map.getLayer(id));
      if (layers.length) {
        const hits = map.queryRenderedFeatures(e.point, { layers });
        features = hits ? Array.from(hits) : [];
      }
      cb(e.lngLat.lng, e.lngLat.lat, features);
    };

    map.on('load', onLoad);
    map.on('styledata', onStyledata);
    map.on('zoomend', zoomClass);
    map.on('click', onClick);
    // The legacy swallows map errors; keep that until there is somewhere to surface them.
    map.on('error', () => {});

    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      readyRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, [ensureSourcesAndLayers, applyData, renderLabels]);

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
  }), []);

  return <div id="map" ref={containerRef} />;
});
