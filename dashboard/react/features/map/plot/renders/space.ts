import { COLORS, RADIUS } from '../consts';
import { satPosition, type SatrecCache } from '../propagate';
import type { LooseRecord, PlotContext, SatPos } from '../types';
import { asRec, bool, dimSpan, num, numOrNull, optStr, recs, relTime, str } from '../utils';

function stationPosition(st: LooseRecord, now: number, cache: SatrecCache): SatPos | null {
  const live = satPosition(st, new Date(now), cache);
  if (live) return live;
  if (numOrNull(st.lat) == null || numOrNull(st.lon) == null) return null;
  return { lat: num(st.lat), lon: num(st.lon), alt: numOrNull(st.alt), vel: numOrNull(st.vel), live: false };
}

function orbitText(st: LooseRecord, pos: SatPos, now: number): string {
  const alt = numOrNull(pos.alt);
  const vel = numOrNull(pos.vel);
  const period = numOrNull(st.period);
  const inclination = numOrNull(st.inclination);
  const apogee = numOrNull(st.apogee);
  const perigee = numOrNull(st.perigee);
  const epoch = optStr(st.epoch);
  return `Lat ${pos.lat.toFixed(2)}° · Lon ${pos.lon.toFixed(2)}°<br>Altitude ${alt != null ? alt + ' km' : '--'}${
    vel ? ` · ${vel.toLocaleString()} km/h` : ''
  }<br>${period ? `Period ${period.toFixed(1)} min · ` : ''}${
    inclination != null ? `Incl ${inclination.toFixed(1)}°` : ''
  }${apogee != null ? `<br>Apogee ${apogee} km · Perigee ${perigee} km` : ''}${
    epoch ? `<br>${dimSpan(`Elements ${relTime(epoch, now)} · NORAD ${str(st.noradId)}`)}` : ''
  }`;
}

export function plotSpace({ D, now, points, labels }: PlotContext): void {
  const cache: SatrecCache = new Map();
  recs(asRec(D.space).stations).forEach((st) => {
    const pos = stationPosition(st, now, cache);
    if (!pos) return;
    const liveLabel = pos.live ? 'live SGP4' : str(st.live) || 'position at sweep';
    const isPrimary = bool(st.primary);
    const isAttached = bool(st.attached);
    points.push({
      lat: pos.lat,
      lng: pos.lon,
      size: isPrimary ? 0.4 : 0.22,
      _r: isPrimary ? RADIUS.spacePrimary : RADIUS.spaceSecondary,
      color: isPrimary ? COLORS.spacePrimary : COLORS.spaceSecondary,
      _stroke: COLORS.spaceStroke,
      type: 'space',
      priority: isPrimary ? 1 : 3,
      _sat: num(st.noradId),
      popHead: str(st.name),
      popMeta: `${isPrimary ? 'Space station' : isAttached ? 'Attached module' : 'Spacecraft'} · ${liveLabel}`,
      popText: orbitText(st, pos, now),
    });
    if (isPrimary) {
      labels.push({ lat: pos.lat, lng: pos.lon, text: str(st.name).split('(')[0]!.trim(), type: 'space' });
    }
  });
}
