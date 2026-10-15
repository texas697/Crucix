import { COLORS, RADIUS } from '../consts';
import type { PlotContext, TrackRow } from '../types';
import { esc, num, optStr } from '../utils';

function trackColor(type: string | undefined): string {
  if (type === 'missile' || type === 'shahed') return COLORS.trackMissile;
  return type === 'fpv' ? COLORS.trackFpv : COLORS.trackOther;
}

export function plotTracks({ input, points }: PlotContext): void {
  const rows: TrackRow[] | undefined = input.tracks?.tracks;
  if (!Array.isArray(rows)) return;
  rows.forEach((t) => {
    points.push({
      lat: num(t.lat),
      lng: num(t.lon),
      size: 0.4,
      _r: RADIUS.track,
      color: trackColor(t.type),
      _stroke: COLORS.trackStroke,
      type: 'track',
      priority: 1,
      ts: optStr(t.updatedAt),
      popHead: (t.title || 'Track') + ' · ' + (t.locality || t.region || ''),
      popMeta: `${(t.type || 'track').toUpperCase()} · ${t.confidence || ''} · ${t.sourceCount || 1} source(s)`,
      popText: `${esc(t.explanation || '')}<br>Heading: ${
        t.heading != null ? t.heading + '°' : '—'
      }<br>Uncertainty: ±${t.uncertaintyKm || '?'} km`,
    });
  });
}
