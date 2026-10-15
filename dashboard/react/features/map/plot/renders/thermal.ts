import { COLORS, RADIUS } from '../consts';
import type { LooseRecord, PlotContext } from '../types';
import { dimSpan, esc, num, optStr, recs, relTime, str } from '../utils';

function regionSummary(t: LooseRecord): string {
  return `Region 24 h: ${num(t.det).toLocaleString()} detections · ${num(t.night).toLocaleString()} at night · ${num(
    t.hi,
  ).toLocaleString()} above 10 MW`;
}

export function plotThermal({ D, now, points }: PlotContext): void {
  recs(D.thermal).forEach((t) => {
    recs(t.fires).forEach((f) => {
      const frp = num(f.frp);
      const at = optStr(f.at);
      points.push({
        lat: num(f.lat),
        lng: num(f.lon),
        size: 0.12 + Math.min(frp / 200, 0.3),
        _r: RADIUS.minPoint + Math.min(frp / 40, 5),
        color: COLORS.thermal,
        _stroke: COLORS.thermalStroke,
        type: 'thermal',
        priority: 3,
        ts: at,
        popHead: `Thermal detection · ${frp.toFixed(0)} MW`,
        popMeta: `NASA FIRMS${f.sat ? ' · ' + str(f.sat) : ''}${f.night ? ' · night' : ''}${
          at ? ' · ' + relTime(at, now) : ''
        }`,
        popText: `${esc(t.region)}${f.conf ? ` · ${esc(f.conf)} confidence` : ''}<br>Fire radiative power ${frp.toFixed(
          1,
        )} MW${at ? `<br>Detected ${at.slice(0, 16).replace('T', ' ')} UTC` : ''}<br>${dimSpan(regionSummary(t))}`,
      });
    });
  });
}
