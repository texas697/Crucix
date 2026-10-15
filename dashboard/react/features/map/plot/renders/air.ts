import { AIR_COORDS, COLORS, RADIUS } from '../consts';
import type { PlotContext } from '../types';
import { asArr, dimSpan, esc, num, optStr, recs, relTime, str } from '../utils';

function topTypes(top: unknown): string {
  const list = asArr(top)
    .slice(0, 3)
    .map((t) => {
      const tt = asArr(t);
      return tt[0] + ' (' + tt[1] + ')';
    })
    .join(', ');
  return esc(list) || '--';
}

export function plotAir({ D, now, points, labels }: PlotContext): void {
  recs(D.air).forEach((a, i) => {
    const c = AIR_COORDS[i];
    if (!c) return;
    const total = num(a.total);
    const sampledAt = optStr(a.sampledAt);
    const via =
      str(a.coverage) === 'sampled'
        ? 'sampled via adsb.lol' + (sampledAt ? ' ' + relTime(sampledAt, now) : '')
        : 'via ' + (str(a.via) || 'OpenSky');
    const military = num(a.military) ? ` · <b>${num(a.military)} military</b>` : '';
    const note = a.note ? '<br>' + dimSpan(esc(a.note)) : '';
    points.push({
      lat: c.lat,
      lng: c.lon,
      size: 0.3,
      _r: RADIUS.air + Math.min(total / 40, 10),
      color: COLORS.air,
      _stroke: COLORS.airStroke,
      type: 'air',
      priority: 1,
      popHead: str(a.region),
      popMeta: `Air Activity · ${total} aircraft · ${via} · marker at theater centre`,
      popText: `${total} aircraft tracked${military}<br>No callsign: ${num(a.noCallsign)}<br>Above FL390: ${num(
        a.highAlt,
      )}<br>Top: ${topTypes(a.top)}${note}`,
    });
    labels.push({ lat: c.lat, lng: c.lon, text: str(a.region).replace(' Region', '') + ' ' + total, type: 'air' });
  });
}
