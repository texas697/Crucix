import { COLORS, RADIUS } from '../consts';
import type { PlotContext } from '../types';
import { dimSpan, esc, num, numOrNull, recs, str } from '../utils';

function flightLevel(alt: number | null): string {
  if (alt == null) return 'alt n/a';
  return alt <= 0 ? 'on ground' : 'FL' + String(Math.round(alt / 100)).padStart(3, '0');
}

export function plotMilitaryAir({ D, points }: PlotContext): void {
  recs(D.milAir).forEach((m) => {
    const gs = numOrNull(m.gs);
    const trk = numOrNull(m.trk);
    const callsign = str(m.cs) || str(m.hex).toUpperCase();
    const type = str(m.type);
    const detail = [
      m.reg ? 'Reg ' + esc(m.reg) : '',
      gs != null ? gs + ' kt' : '',
      trk != null ? 'hdg ' + trk + '°' : '',
      m.sq ? 'squawk ' + esc(m.sq) : '',
    ]
      .filter(Boolean)
      .join(' · ');
    points.push({
      lat: num(m.lat),
      lng: num(m.lon),
      size: 0.22,
      _r: RADIUS.militaryAir,
      color: COLORS.militaryAir,
      _stroke: COLORS.militaryAirStroke,
      type: 'militaryAir',
      priority: 2,
      heading: trk,
      label: [callsign, type].filter(Boolean).join(' '),
      popHead: callsign + (type ? ' · ' + type : ''),
      popMeta: `Military aircraft · ${str(m.country)} · ${flightLevel(numOrNull(m.alt))}`,
      popText: detail + '<br>' + dimSpan(`Live ADS-B via adsb.lol · ICAO ${esc(m.hex)}`),
    });
  });
}
