// The hand-positioned map popup, ported from the legacy `#mapPopup` markup (jarvis.html 722) and
// `showPopup` (2190-2226). The parent owns the open/closed state and computes the `left`/`top`
// percentages (legacy `map.project`); this component is a pure presentation surface.

import type { ReactNode } from 'react';
import { safeExternalUrl } from '../../shared/safeUrl';

export interface MapPopupProps {
  head?: string;
  text?: string;
  meta?: string;
  lng?: number | null;
  lat?: number | null;
  url?: string | null;
  isNew?: boolean;
  /** Left offset as a CSS percentage of the map container (parent computes it via `map.project`). */
  left?: number;
  /** Top offset as a CSS percentage of the map container. */
  top?: number;
  /** Copy-coordinates action; the parent writes to the clipboard (legacy inline onclick). */
  onCopy?: () => void;
  onClose?: () => void;
}

export function MapPopup({
  head,
  text,
  meta,
  lng,
  lat,
  url,
  isNew,
  left = 50,
  top = 50,
  onCopy,
  onClose,
}: MapPopupProps) {
  const hasCoords = lat != null && lng != null;
  const safeUrl = safeExternalUrl(url);

  const parts: ReactNode[] = [];
  if (hasCoords) {
    parts.push(
      <button className="pp-copy" type="button" title="Copy coordinates" onClick={onCopy} key="copy">
        {lat.toFixed(2)}, {lng.toFixed(2)}
      </button>,
    );
  }
  if (safeUrl) {
    parts.push(
      <a className="pp-link" href={safeUrl} target="_blank" rel="noopener noreferrer" key="link">
        Open source &#8599;
      </a>,
    );
  }
  if (isNew) parts.push(<span className="pp-new" key="new">&#9679; new</span>);

  return (
    <div
      className="map-popup show"
      id="mapPopup"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <button className="pp-close" type="button" onClick={onClose} aria-label="Close popup">&times;</button>
      <div className="pp-head">{head || ''}</div>
      {/* The legacy set this with `innerHTML`; the text carries trusted markup built by `plotData`. */}
      <div className="pp-text" dangerouslySetInnerHTML={{ __html: text || '' }} />
      <div className="pp-meta">{meta || ''}</div>
      <div className="pp-foot" style={{ display: parts.length ? 'flex' : 'none' }}>{parts}</div>
    </div>
  );
}
