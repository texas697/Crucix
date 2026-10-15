// The `#selPanel` selection list, ported from `renderSelection()` (jarvis.html 1588-1614) and
// `focusSelectionItem()` (1615-1619). The legacy grouped `selectedItems` by layer type, sorted the
// groups by count, and rendered the first 40 rows of each; the area-brief stage was mounted at the top
// of `#selBody` inside `#abMount`. Here the brief is an optional `brief` node so `AreaBrief` stays a
// separate component and the panel is testable in isolation.

import type { ReactNode } from 'react';
import type { MapPoint } from './plot';
import { LAYER_DEFS } from './layerDefs';

export interface SelectionPanelProps {
  items: MapPoint[];
  /** Focus the marker at this index in `items` (legacy `focusSelectionItem`). */
  onFocus: (index: number) => void;
  onClear: () => void;
  /** The area-brief stage, rendered inside `#abMount` at the top of `#selBody`. */
  brief?: ReactNode;
  /** Keep the panel open while a brief is loading/shown even with no markers (legacy `AB.status`). */
  hasBrief?: boolean;
}

export function SelectionPanel({ items, onFocus, onClear, brief, hasBrief = false }: SelectionPanelProps) {
  // The panel stays open while an area brief is loading or shown (legacy renderSelection guard).
  if (!items.length && !hasBrief) return null;

  const groups: Record<string, Array<[number, MapPoint]>> = {};
  items.forEach((p, i) => {
    (groups[p.type] ??= []).push([i, p]);
  });
  const keys = Object.keys(groups).sort((a, b) => (groups[b]?.length ?? 0) - (groups[a]?.length ?? 0));

  return (
    <div className={`sel-panel show${hasBrief ? ' has-brief' : ''}`} id="selPanel">
      <div className="sel-head">
        <span className="sel-title">Selected</span>
        <span className="sel-count" id="selCount">{items.length}</span>
        <button className="sel-clear" type="button" onClick={onClear}>Clear</button>
      </div>
      <div className="sel-body" id="selBody">
        <div id="abMount">{brief}</div>
        {items.length > 0 && <div className="sel-divider">Markers in area</div>}
        {items.length > 0 && (
          <div className="sel-summary">
            {items.length} marker{items.length > 1 ? 's' : ''} across {keys.length} layer{keys.length > 1 ? 's' : ''}
          </div>
        )}
        {keys.map((type) => {
          const arr = groups[type] ?? [];
          const def = LAYER_DEFS.find((l) => l.key === type);
          const color = def ? def.color : '#dce2ec';
          const label = def ? def.label : type;
          return (
            <div className="sel-group" key={type}>
              <div className="sel-gh">
                <span className="sel-dot" style={{ background: color }} />
                {label}
                <span className="sel-gc">{arr.length}</span>
              </div>
              {arr.slice(0, 40).map(([idx, p]) => (
                <button className="sel-item" type="button" key={idx} onClick={() => onFocus(idx)}>
                  <span className="sel-iname">{p.popHead || label}</span>
                  <span className="sel-imeta">{(p.popMeta || '').slice(0, 64)}</span>
                </button>
              ))}
              {arr.length > 40 && <div className="sel-more">+{arr.length - 40} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
