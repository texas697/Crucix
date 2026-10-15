import { useState } from 'react';
import { LAYER_DEFS, TIME_WINDOW_LIST, matchesLayerFilter, type LayerInfo, type TimeWindow } from './layerDefs';
import { REGION_LABEL, type RegionKey } from './regions';

// The map legend and layer-info overlay, ported from renderMapLegend() (1412-1429), openLayerInfo()
// (1441-1456) and the static #layerOverlay shell (767-780) in jarvis.html.
//
// filterLayers() (1431-1440) previously toggled `style.display` on the rendered chips; here the
// query lives in local state and the chips are filtered during render with the same matchesLayerFilter
// predicate. Every other input (visible, timeWindow, region, counts) is a prop.

export interface MapLegendProps {
  region: RegionKey;
  /** Total markers available per layer key (legacy `layerCounts`). */
  layerCounts: Record<string, number | undefined>;
  /** Per-layer visibility (legacy `layerVisible`). */
  visible: Record<string, boolean | undefined>;
  timeWindow: TimeWindow;
  onToggleLayer: (key: string) => void;
  onSetAll: (visible: boolean) => void;
  onSetTimeWindow: (window: TimeWindow) => void;
  onClearRegion: () => void;
  onInfo: (key: string) => void;
}

export function MapLegend({
  region,
  layerCounts,
  visible,
  timeWindow,
  onToggleLayer,
  onSetAll,
  onSetTimeWindow,
  onClearRegion,
  onInfo,
}: MapLegendProps) {
  const [query, setQuery] = useState('');
  const chips = LAYER_DEFS.filter((l) => (layerCounts[l.key] || 0) > 0 && matchesLayerFilter(l, query));

  return (
    <div className="map-legend" id="mapLegend">
      <div className="leg-controls">
        {region !== 'world' && (
          <button className="leg-region" type="button" onClick={onClearRegion} title="Clear region filter">
            {REGION_LABEL[region]} <span>&#10005;</span>
          </button>
        )}
        <button className="leg-action" type="button" onClick={() => onSetAll(true)}>All</button>
        <button className="leg-action" type="button" onClick={() => onSetAll(false)}>None</button>
        {TIME_WINDOW_LIST.map((w) => (
          <button
            key={w}
            type="button"
            className={`leg-time${timeWindow === w ? ' on' : ''}`}
            onClick={() => onSetTimeWindow(w)}
          >
            {w === 'all' ? 'All time' : w}
          </button>
        ))}
        <input
          className="leg-search"
          id="legSearch"
          placeholder="Filter layers"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="leg-chips">
        {chips.map((l) => {
          const on = !!visible[l.key];
          return (
            <span
              key={l.key}
              className={`leg-chip${on ? '' : ' off'}`}
              data-layer={l.key}
              onClick={() => onToggleLayer(l.key)}
              title={`${on ? 'Hide' : 'Show'} ${l.label}`}
            >
              <span className="leg-dot" style={{ background: l.color }} />
              {l.label}
              <span className="leg-count">{layerCounts[l.key] || 0}</span>
              <button
                className="leg-info"
                type="button"
                onClick={(e) => { e.stopPropagation(); onInfo(l.key); }}
                title="About this layer"
              >
                i
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export interface LayerInfoOverlayProps {
  layerKey: string | null;
  info: LayerInfo | null;
  onClose?: () => void;
}

/** The `#layerOverlay` modal, ported from openLayerInfo() (1441-1456). Renders nothing when closed. */
export function LayerInfoOverlay({ layerKey, info, onClose }: LayerInfoOverlayProps) {
  if (!layerKey || !info) return null;
  const def = LAYER_DEFS.find((l) => l.key === layerKey);
  const label = def?.label || layerKey;

  return (
    <div
      className="glossary-overlay show"
      id="layerOverlay"
      data-surface="layer-info"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="glossary-panel" role="dialog" aria-modal="true" aria-labelledby="layerTitle">
        <div className="glossary-head">
          <div>
            <div className="glossary-kicker">Map layer</div>
            <div className="glossary-title" id="layerTitle">{label}</div>
            <div className="glossary-sub" id="layerSub">What this layer shows, where it comes from, and what it does not prove.</div>
          </div>
          <button className="glossary-close" type="button" onClick={onClose} aria-label="Close layer info">&times;</button>
        </div>
        <div className="glossary-body" id="layerBody">
          <div className="glossary-card">
            <div className="glossary-line">
              <span className="glossary-label" style={{ color: def?.color }}>Purpose</span>
              {info.purpose}
            </div>
            <div className="glossary-line"><span className="glossary-label">Source</span>{info.source}</div>
            <div className="glossary-line"><span className="glossary-label">Freshness</span>{info.freshness}</div>
            <div className="glossary-line"><span className="glossary-label">Confidence</span>{info.confidence}</div>
            <div className="glossary-line"><span className="glossary-label">Limitations</span>{info.limitations.join(' · ')}</div>
          </div>
        </div>
        <div className="glossary-foot">Layer metadata describes the source and its limits. Treat a single layer as one lens, not a conclusion.</div>
      </div>
    </div>
  );
}
