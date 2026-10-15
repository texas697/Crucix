import { REGION_ORDER, type RegionKey } from './regions';

// The map region bar (`.map-region-bar#mapRegionBar`), ported from renderRegionControls() /
// getRegionControlsMarkup() in jarvis.html (1266-1286). Six upper-cased region buttons (the current
// one carries `active`), the place search box (Enter fires onSearch), a flex spacer, the live dot,
// the source/marker/news meta line and the hint text.
//
// The legacy button labels are spelled out rather than taken from REGION_LABEL, matching the
// upper-casing at 1268 exactly.

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

/** Legacy upper-cased region button label (1268). */
function regionButtonLabel(region: RegionKey): string {
  if (region === 'middleEast') return 'MIDDLE EAST';
  if (region === 'asiaPacific') return 'ASIA PACIFIC';
  return region.toUpperCase();
}

export function RegionBar({
  region,
  sourcesOk,
  sourcesQueried,
  markers,
  news,
  onRegion,
  onSearch,
  hint = 'Scroll to zoom · drag to pan',
}: RegionBarProps) {
  return (
    <div className="map-region-bar" id="mapRegionBar">
      <div className="map-regions">
        {REGION_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            className={`region-btn${r === region ? ' active' : ''}`}
            data-region={r}
            onClick={() => onRegion(r)}
          >
            {regionButtonLabel(r)}
          </button>
        ))}
      </div>
      <input
        className="map-search"
        id="mapSearch"
        type="search"
        placeholder="Search place, event, channel"
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch(e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
      />
      <div className="map-bar-spacer" />
      <span className="map-bar-live"><span className="dot" />Live</span>
      <span className="map-bar-meta">
        {sourcesOk}/{sourcesQueried} sources · {markers} markers · {news} news
      </span>
      <span className="map-bar-hint" id="mapHint">{hint}</span>
    </div>
  );
}
